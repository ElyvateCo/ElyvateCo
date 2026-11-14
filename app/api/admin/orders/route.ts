import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { releaseOrderResources, outOfStockProductId } from '@/lib/orderResources'

function unauth() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauth()
  const db = supabaseAdmin()
  const { data } = await db.from('orders').select('*').eq('store_id', store.id).order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

const ORDER_STATUSES = ['processing', 'fulfilled', 'shipped', 'delivered', 'cancelled']
const PAYMENT_STATUSES = ['pending', 'paid', 'failed']

export async function PATCH(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauth()
  const body = await req.json().catch(() => null)
  const id = body?.id
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing order id' }, { status: 400 })

  // Only these two fields can be changed here. (Before, ANY column in the
  // request body was written to the order — including store_id and prices.)
  const updates: { order_status?: string; payment_status?: string } = {}
  if (body.order_status !== undefined) {
    if (!ORDER_STATUSES.includes(body.order_status)) return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
    updates.order_status = body.order_status
  }
  if (body.payment_status !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.payment_status)) return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
    updates.payment_status = body.payment_status
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const db = supabaseAdmin()

  // Fetch the current state first: it confirms the order belongs to this
  // store, and tells us what is actually CHANGING (so a repeated click can't
  // send a duplicate notification or give stock back twice).
  const { data: existing } = await db
    .from('orders')
    .select('order_status, payment_status, resources_released')
    .eq('id', id)
    .eq('store_id', store.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Un-cancelling an order whose stock was given back: take the stock again,
  // or refuse if it has been sold in the meantime.
  if (updates.order_status && updates.order_status !== 'cancelled' && existing.order_status === 'cancelled' && existing.resources_released) {
    const { error: reopenError } = await db.rpc('reopen_order_resources', { p_order_id: id })
    if (reopenError) {
      if (outOfStockProductId(reopenError)) {
        return NextResponse.json({ error: 'Not enough stock left to reopen this order.' }, { status: 409 })
      }
      console.error('reopen_order_resources failed', reopenError.message)
      return NextResponse.json({ error: 'Could not reopen this order' }, { status: 500 })
    }
  }

  const { error: updateError } = await db.from('orders').update(updates).eq('id', id).eq('store_id', store.id)
  if (updateError) {
    console.error('Order update failed', updateError.message)
    return NextResponse.json({ error: 'Could not update the order' }, { status: 500 })
  }

  // Cancelled -> the stock and the coupon use go back (once)
  if (updates.order_status === 'cancelled' && existing.order_status !== 'cancelled') {
    await releaseOrderResources(id)
  }

  if (updates.payment_status === 'paid' && existing.payment_status !== 'paid') {
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
