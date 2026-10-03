'use client'
import { formatPrice } from '@/lib/money'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import { supabaseBrowser } from '@/lib/supabase'
import type { Order } from '@/lib/supabase'
import { useStoreId } from '@/lib/storeContext'
import { OrderListSkeleton } from '@/components/store/Skeletons'

const statusStyle = (s: string) => {
  if (s === 'delivered') return 'bg-green-100 text-green-700'
  if (s === 'shipped')   return 'bg-blue-100 text-blue-700'
  if (s === 'fulfilled') return 'bg-purple-100 text-purple-700'
  if (s === 'cancelled') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

const payStyle = (s: string) =>
  s === 'paid' ? 'bg-green-100 text-green-700' : s === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'

export default function OrderHistoryPage() {
  const storeId = useStoreId()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [orders, setOrders]   = useState<Order[]>([])
  const [fetching, setFetching] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) { router.replace('/account/login'); return }
    if (!user || !storeId) return

    const sb = supabaseBrowser()
    sb.from('orders')
      .select('*')
      .eq('store_id', storeId)
      .eq('customer_email', user.email!)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setFetching(false) })
  }, [user, loading, router, storeId])

  if (loading || fetching) return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-2 rounded-xl text-ink-secondary">
            <ArrowLeft size={18} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink-primary">Order History</h1>
        </div>
        <OrderListSkeleton count={3} />
      </div>
    </div>
  )

  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/account" className="p-2 rounded-xl hover:bg-surface-100 text-ink-secondary transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-display text-3xl font-semibold text-ink-primary">Order History</h1>
        </div>

        {orders.length === 0 ? (
          <div className="card p-16 text-center">
            <Package size={40} className="text-surface-300 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-ink-primary mb-2">No orders yet</h2>
            <p className="text-sm text-ink-secondary mb-6">When you place an order, it will appear here.</p>
            <Link href="/products" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="bg-surface-0 rounded-2xl shadow-card overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-surface-50 transition-colors"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-ink-muted">#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded-xl text-xs font-medium capitalize ${statusStyle(o.order_status)}`}>
                        {o.order_status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-xl text-xs font-medium ${payStyle(o.payment_status)}`}>
                        {o.payment_status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink-primary truncate">{o.product_name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{new Date(o.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <p className="font-bold text-ink-primary">{formatPrice(o.total_price)}</p>
                      <p className="text-xs text-ink-muted">Qty: {o.quantity}</p>
                    </div>
                    {expanded === o.id ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
                  </div>
                </div>

                {/* Expanded */}
                {expanded === o.id && (
                  <div className="border-t border-surface-200 p-5 bg-surface-50 grid sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Shipping To</p>
                      <div className="text-sm text-ink-secondary space-y-0.5">
                        <p className="font-medium text-ink-primary">{o.customer_name}</p>
                        <p>{o.customer_address}</p>
                        <p>{o.customer_city}, {o.customer_zip}</p>
                        <p>{o.customer_country}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Order Summary</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between text-ink-secondary">
                          <span>Subtotal</span>
                          <span>{formatPrice((o.total_price + (o.discount_amount ?? 0)))}</span>
                        </div>
                        {o.coupon_code && (
                          <div className="flex justify-between text-green-600">
                            <span>Coupon ({o.coupon_code})</span>
                            <span>−{formatPrice((o.discount_amount ?? 0))}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-ink-primary border-t border-surface-200 pt-1 mt-1">
                          <span>Total Paid</span>
                          <span>{formatPrice(o.total_price)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
