import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'

function unauth() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauth()
  const db = supabaseAdmin()
  const { data } = await db.from('orders').select('*').eq('store_id', store.id).order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauth()
  const { id, ...updates } = await req.json()
  const db = supabaseAdmin()

  // Fetch the current state first so we can tell whether payment_status is
  // actually TRANSITIONING to 'paid' (vs. already being paid) — without
  // this check, clicking "Mark as Paid" again, or any other unrelated
  // update to an already-paid order, would fire a duplicate notification.
  // The store_id check here also confirms this order actually belongs to
  // the merchant making the request.
  let previousPaymentStatus: string | null = null
  if ('payment_status' in updates) {
    const { data: existing } = await db.from('orders').select('payment_status').eq('id', id).eq('store_id', store.id).single()
    previousPaymentStatus = existing?.payment_status ?? null
  }

  await db.from('orders').update(updates).eq('id', id).eq('store_id', store.id)

  if (updates.payment_status === 'paid' && previousPaymentStatus !== 'paid') {
    await db.from('notifications').insert({
      store_id: store.id,
      type: 'order_update',
      order_id: id,
      title: 'Payment confirmed!',
      message: 'Your order is now processing — we\'ll notify you again once it ships.',
    })
  }

  return NextResponse.json({ ok: true })
}
