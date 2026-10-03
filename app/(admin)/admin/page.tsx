import { formatPrice } from '@/lib/money'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getOwnedStore } from '@/lib/ownedStore'
import { ShoppingBag, Banknote, Package, TrendingUp } from 'lucide-react'

export const revalidate = 0

async function getStats(storeId: string) {
  const db = supabaseAdmin()
  const [{ count: orders }, { count: products }, { data: revenue }] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }).eq('store_id', storeId).eq('payment_status', 'paid'),
    db.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
    db.from('orders').select('total_price').eq('store_id', storeId).eq('payment_status', 'paid'),
  ])
  const totalRevenue = revenue?.reduce((s, o) => s + (o.total_price ?? 0), 0) ?? 0
  return { orders: orders ?? 0, products: products ?? 0, totalRevenue }
}

async function getRecentOrders(storeId: string) {
  const db = supabaseAdmin()
  const { data } = await db.from('orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(5)
  return data ?? []
}

export default async function AdminDashboard() {
  // Only THIS merchant's own store — never totals across every store
  const store = await getOwnedStore()
  // No store yet (e.g. signed in with Google) or setup not finished → onboarding
  if (!store || store.onboarding_completed === false) redirect('/onboarding')
  const [stats, orders] = await Promise.all([getStats(store.id), getRecentOrders(store.id)])

  const cards = [
    { label: 'Total Revenue',  value: `${formatPrice(stats.totalRevenue)}`, icon: Banknote,  color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Total Orders',   value: stats.orders,                         icon: ShoppingBag, color: 'text-brand-600',  bg: 'bg-brand-50' },
    { label: 'Products',       value: stats.products,                       icon: Package,     color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg Order Value',value: stats.orders ? `${formatPrice((stats.totalRevenue / stats.orders))}` : '৳0', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-primary mb-8">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-ink-primary">{value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-surface-200">
          <h2 className="font-semibold text-ink-primary">Recent Orders</h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-8 text-center text-ink-muted text-sm">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  {['Order ID', 'Customer', 'Product', 'Total', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium">{o.customer_name}</p>
                      <p className="text-ink-muted text-xs">{o.customer_email}</p>
                    </td>
                    <td className="px-5 py-3 max-w-[200px] truncate">{o.product_name}</td>
                    <td className="px-5 py-3 font-semibold">{formatPrice(o.total_price)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-medium capitalize ${
                        o.order_status === 'delivered' ? 'bg-green-100 text-green-700' :
                        o.order_status === 'shipped'   ? 'bg-blue-100 text-blue-700' :
                        o.order_status === 'fulfilled' ? 'bg-purple-100 text-purple-700' :
                        o.order_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{o.order_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
