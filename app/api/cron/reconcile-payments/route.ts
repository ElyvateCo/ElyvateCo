import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { loadGatewayCreds } from '@/lib/gateways/credentials'
import { bkashQueryStatus, type BkashCreds } from '@/lib/gateways/bkash'
import { nagadVerify, nagadOrderId, type NagadCreds } from '@/lib/gateways/nagad'
import { markOrderPaid, markOrderFailed } from '@/lib/gateways/finalize'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MIN_AGE_MIN = 15      // give the customer time to finish paying
const GIVE_UP_MIN = 60      // after this, a payment the gateway doesn't know as paid is cancelled
const BATCH = 40

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || ''
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (secret.length < 16 || given.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret))
}

// Online (bKash / Nagad) orders are normally confirmed when the customer
// comes back from the payment page. If they pay and then close the tab, the
// order would stay "pending" forever (money taken, stock stuck). This job
// asks the gateway about every such order and settles it.
// Vercel calls it on the schedule in vercel.json, sending CRON_SECRET.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const db = supabaseAdmin()
  const olderThan = new Date(Date.now() - MIN_AGE_MIN * 60_000).toISOString()
  const { data: orders, error } = await db
    .from('orders')
    .select('id, store_id, total_price, payment_method, gateway_payment_id, payment_trx_id, created_at')
    .eq('payment_status', 'pending')
    .neq('order_status', 'cancelled')
    .in('payment_method', ['bkash_auto', 'nagad_auto'])
    .lt('created_at', olderThan)
    .order('created_at', { ascending: true })
    .limit(BATCH)
  if (error) {
    console.error('reconcile: could not list orders', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const summary = { checked: 0, paid: 0, cancelled: 0, needsReview: 0, skipped: 0 }
  for (const o of orders ?? []) {
    summary.checked++
    const ageMin = (Date.now() - new Date(o.created_at).getTime()) / 60_000
    try {
      if (!o.gateway_payment_id) {
        // The gateway never gave a payment link, so nothing can have been paid
        if (ageMin > GIVE_UP_MIN) { await markOrderFailed(o.id); summary.cancelled++ } else summary.skipped++
        continue
      }

      let paid = false, trx: string | null = null, amount = 0, definitelyNotPaid = false

      if (o.payment_method === 'bkash_auto') {
        const loaded = await loadGatewayCreds<BkashCreds>(o.store_id, 'bkash')
        if (!loaded) { summary.skipped++; continue }
        const r = await bkashQueryStatus(loaded.creds, loaded.mode, o.gateway_payment_id)
        paid = r.completed; trx = r.trxID; amount = r.amount
        definitelyNotPaid = !r.completed && r.known
      } else {
        const loaded = await loadGatewayCreds<NagadCreds>(o.store_id, 'nagad')
        if (!loaded) { summary.skipped++; continue }
        const r = await nagadVerify(loaded.mode, o.gateway_payment_id)
        paid = r.success && r.orderId === nagadOrderId(o.id); trx = r.trxId; amount = r.amount
        definitelyNotPaid = !r.success && r.orderId === nagadOrderId(o.id)
      }

      if (paid) {
        if (Math.abs(amount - Number(o.total_price)) > 0.01) {
          // Money arrived but the amount is unexpected: leave it for the merchant to check by hand
          if (!o.payment_trx_id && trx) await db.from('orders').update({ payment_trx_id: trx }).eq('id', o.id)
          console.error('reconcile: amount mismatch', { orderId: o.id, expected: o.total_price, got: amount })
          summary.needsReview++
        } else if (await markOrderPaid(o.id, trx)) {
          summary.paid++
        }
      } else if (definitelyNotPaid && ageMin > GIVE_UP_MIN) {
        await markOrderFailed(o.id)
        summary.cancelled++
      } else {
        summary.skipped++
      }
    } catch (err) {
      // Gateway/network trouble: leave the order untouched and try again next run
      console.error('reconcile: order failed', o.id, err)
      summary.skipped++
    }
  }
  return NextResponse.json({ ok: true, ...summary })
}
