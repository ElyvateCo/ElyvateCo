import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentStore } from '@/lib/currentStore'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'
import { normalizeBDPhone } from '@/lib/phone'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// After paying by bKash/Nagad the customer sends their Transaction ID (and
// the number they paid from). The merchant checks it against their own
// bKash/Nagad statement and marks the order Paid in the admin panel.
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  if (!rateLimit(ip, 'checkout', limits.checkout)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
    const trxId = typeof body.trxId === 'string' ? body.trxId.trim().toUpperCase() : ''
    const sender = normalizeBDPhone(body.senderNumber)

    if (!UUID.test(orderId)) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!/^[A-Z0-9]{6,20}$/.test(trxId)) {
      return NextResponse.json({ error: 'Enter the Transaction ID exactly as shown in your bKash/Nagad message (letters and numbers only)' }, { status: 400 })
    }
    if (!sender) {
      return NextResponse.json({ error: 'Enter the mobile number you sent the money from, like 01712345678' }, { status: 400 })
    }

    const store = await getCurrentStore()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const db = supabaseAdmin()
    const { data: order } = await db
      .from('orders')
      .select('id, payment_method, payment_status')
      .eq('id', orderId)
      .eq('store_id', store.id)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.payment_method !== 'bkash_manual' && order.payment_method !== 'nagad_manual') {
      return NextResponse.json({ error: 'This order does not need a payment ID' }, { status: 400 })
    }
    if (order.payment_status !== 'pending') {
      return NextResponse.json({ error: 'This order has already been reviewed by the store' }, { status: 400 })
    }

    // One real payment can only ever pay for one order
    const { data: clash } = await db
      .from('orders')
      .select('id')
      .eq('store_id', store.id)
      .eq('payment_trx_id', trxId)
      .neq('id', orderId)
      .limit(1)
    if (clash && clash.length > 0) {
      return NextResponse.json({ error: 'This Transaction ID has already been used on another order' }, { status: 409 })
    }

    const { error } = await db
      .from('orders')
      .update({ payment_trx_id: trxId, payment_sender_number: sender })
      .eq('id', orderId)
      .eq('store_id', store.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Payment proof error:', err)
    return NextResponse.json({ error: 'Could not save your payment details. Please try again.' }, { status: 500 })
  }
}
