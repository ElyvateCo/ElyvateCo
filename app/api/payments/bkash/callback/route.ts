import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestOrigin } from '@/lib/requestOrigin'
import { loadGatewayCreds } from '@/lib/gateways/credentials'
import { bkashExecute, type BkashCreds } from '@/lib/gateways/bkash'
import { markOrderPaid, markOrderFailed } from '@/lib/gateways/finalize'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// bKash sends the customer back here after they pay (or cancel). We NEVER
// trust the ?status in the link — the payment is confirmed by asking bKash
// directly (execute), and the amount must match the order.
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req)
  const url = new URL(req.url)
  const orderId = url.searchParams.get('order') || ''
  const paymentID = url.searchParams.get('paymentID') || ''
  const status = url.searchParams.get('status') || ''

  const back = (path: string) => NextResponse.redirect(`${origin}${path}`)
  if (!UUID.test(orderId)) return back('/')

  const db = supabaseAdmin()
  const { data: order } = await db
    .from('orders')
    .select('id, store_id, total_price, payment_status, payment_method, gateway_payment_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order || order.payment_method !== 'bkash_auto') return back('/')

  if (order.payment_status === 'paid') return back(`/order-success?order=${order.id}`)

  if (status !== 'success' || !paymentID || paymentID !== order.gateway_payment_id) {
    await markOrderFailed(order.id)
    return back(`/checkout?payment=${status === 'cancel' ? 'cancelled' : 'failed'}`)
  }

  try {
    const loaded = await loadGatewayCreds<BkashCreds>(order.store_id, 'bkash')
    if (!loaded) throw new Error('bKash credentials missing')
    const result = await bkashExecute(loaded.creds, loaded.mode, paymentID)

    if (!result.completed) {
      await markOrderFailed(order.id)
      return back('/checkout?payment=failed')
    }

    if (Math.abs(result.amount - Number(order.total_price)) > 0.01) {
      // Money was taken but the amount is unexpected: keep the order pending
      // with the TrxID attached so the merchant can review it by hand.
      console.error('bKash amount mismatch', { orderId: order.id, expected: order.total_price, got: result.amount })
      await db.from('orders').update({ payment_trx_id: result.trxID }).eq('id', order.id)
      return back(`/order-success?order=${order.id}`)
    }

    await markOrderPaid(order.id, result.trxID)
    return back(`/order-success?order=${order.id}`)
  } catch (err) {
    console.error('bKash callback error:', err)
    return back('/checkout?payment=failed')
  }
}
