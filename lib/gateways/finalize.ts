import { supabaseAdmin } from '@/lib/supabase'
import { sendAdminOrderNotification, sendCustomerConfirmation } from '@/lib/resend'
import { releaseOrderResources } from '@/lib/orderResources'

// Marks an online-paid order as paid — exactly once (the status check in the
// update means a refreshed or replayed callback can never pay twice) — and
// then sends the order emails that were held back until now.
export async function markOrderPaid(orderId: string, trxId: string | null): Promise<boolean> {
  const db = supabaseAdmin()
  const { data: updated } = await db
    .from('orders')
    .update({ payment_status: 'paid', ...(trxId ? { payment_trx_id: trxId } : {}) })
    .eq('id', orderId)
    .eq('payment_status', 'pending')
    .select()

  const order = updated?.[0]
  if (!order) return false

  try {
    await Promise.all([
      sendAdminOrderNotification(order),
      order.customer_email ? sendCustomerConfirmation(order) : Promise.resolve(),
    ])
  } catch (err) {
    console.error('Paid order emails failed:', err)
  }
  return true
}

// Cancels a still-unpaid online order and gives its stock + coupon back.
// Does nothing to an order that is already paid.
export async function markOrderFailed(orderId: string) {
  const { data } = await supabaseAdmin()
    .from('orders')
    .update({ payment_status: 'failed', order_status: 'cancelled' })
    .eq('id', orderId)
    .eq('payment_status', 'pending')
    .select('id')
  if (data && data.length > 0) await releaseOrderResources(orderId)
}
