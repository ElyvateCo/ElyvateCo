import { supabaseAdmin } from '@/lib/supabase'

// Gives an order's stock + coupon use back, exactly once (the database
// remembers it already did). Safe to call from several places.
export async function releaseOrderResources(orderId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin().rpc('release_order_resources', { p_order_id: orderId })
    if (error) console.error('release_order_resources failed', orderId, error.message)
  } catch (err) {
    console.error('release_order_resources crashed', orderId, err)
  }
}

// Pulls the product id out of the database's 'out_of_stock:<uuid>' error.
export function outOfStockProductId(err: { message?: string } | null | undefined): string | null {
  const m = /out_of_stock:([0-9a-f-]{36})/i.exec(err?.message ?? '')
  return m ? m[1] : null
}
