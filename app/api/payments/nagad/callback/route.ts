import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getRequestOrigin } from '@/lib/requestOrigin'
import { loadGatewayCreds } from '@/lib/gateways/credentials'
import { nagadVerify, nagadOrderId, type NagadCreds } from '@/lib/gateways/nagad'
import { markOrderPaid, markOrderFailed } from '@/lib/gateways/finalize'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Nagad sends the customer back here after they pay (or cancel). The
// result in the link is NOT trusted: we verify the payment with Nagad
// directly and check it belongs to this order and this amount.
export async function GET(req: NextRequest) {
  const origin = getRequestOrigin(req)
  const url = new URL(req.url)
  const orderId = url.searchParams.get('order') || ''
  const paymentRefId = url.searchParams.get('payment_ref_id') || ''

  const back = (path: string) => NextResponse.redirect(`${origin}${path}`)
  if (!UUID.test(orderId)) return back('/')

  const db = supabaseAdmin()
  const { data: order } = await db
    .from('orders')
    .select('id, store_id, total_price, payment_status, payment_method, gateway_payment_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order || order.payment_method !== 'nagad_auto') return back('/')

  if (order.payment_status === 'paid') return back(`/order-success?order=${order.id}`)

  if (!paymentRefId || paymentRefId !== order.gateway_payment_id) {
    await markOrderFailed(order.id)
    return back('/checkout?payment=failed')
  }

  try {
    const loaded = await loadGatewayCreds<NagadCreds>(order.store_id, 'nagad')
    if (!loaded) throw new Error('Nagad credentials missing')
    const result = await nagadVerify(loaded.mode, paymentRefId)

    if (!result.success || result.orderId !== nagadOrderId(order.id)) {
      await markOrderFailed(order.id)
      return back(`/checkout?payment=${url.searchParams.get('status')?.toLowerCase() === 'aborted' ? 'cancelled' : 'failed'}`)
    }

    if (Math.abs(result.amount - Number(order.total_price)) > 0.01) {
      console.error('Nagad amount mismatch', { orderId: order.id, expected: order.total_price, got: result.amount })
      await db.from('orders').update({ payment_trx_id: result.trxId }).eq('id', order.id)
      return back(`/order-success?order=${order.id}`)
    }

    await markOrderPaid(order.id, result.trxId)
    return back(`/order-success?order=${order.id}`)
  } catch (err) {
    console.error('Nagad callback error:', err)
    return back('/checkout?payment=failed')
  }
}
