import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin, ownerEmailMap } from '@/lib/platformAdmin'

export const dynamic = 'force-dynamic'

// Main admin overview. Anyone who isn't the platform owner just gets a 404.
export async function GET() {
  if (!(await getPlatformAdmin())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const db = supabaseAdmin()
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const head = { count: 'exact' as const, head: true }

  const [stores, newStores, orders, products, customers, planRows, paid, recent, emails] = await Promise.all([
    db.from('stores').select('id', head),
    db.from('stores').select('id', head).gte('created_at', weekAgo),
    db.from('orders').select('id', head),
    db.from('products').select('id', head),
    db.from('store_customers').select('id', head),
    db.from('stores').select('plan, status, trial_ends_at').limit(5000),
    db.from('orders').select('total_price').eq('payment_status', 'paid').limit(50000),
    db.from('stores').select('id, store_name, subdomain, plan, created_at, owner_user_id').order('created_at', { ascending: false }).limit(8),
    ownerEmailMap(),
  ])

  const now = Date.now()
  const plans = { free: 0, pro: 0, business: 0, trial: 0, suspended: 0 }
  for (const s of planRows.data ?? []) {
    if (s.plan === 'pro') plans.pro++
    else if (s.plan === 'business') plans.business++
    else if (s.trial_ends_at && new Date(s.trial_ends_at).getTime() > now) plans.trial++
    else plans.free++
    if (s.status === 'suspended') plans.suspended++
  }

  return NextResponse.json({
    stores: stores.count ?? 0,
    newStores: newStores.count ?? 0,
    users: emails.size,
    orders: orders.count ?? 0,
    products: products.count ?? 0,
    customers: customers.count ?? 0,
    paidSales: (paid.data ?? []).reduce((sum, o) => sum + (Number(o.total_price) || 0), 0),
    plans,
    recent: (recent.data ?? []).map(s => ({ id: s.id, name: s.store_name, subdomain: s.subdomain, plan: s.plan, createdAt: s.created_at, owner: emails.get(s.owner_user_id) ?? '' })),
  })
}
