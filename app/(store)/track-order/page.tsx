'use client'
import { formatPrice } from '@/lib/money'
import { useState } from 'react'
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

type Order = {
  id: string
  customer_name: string
  product_name: string
  quantity: number
  total_price: number
  order_status: string
  payment_status: string
  tracking_number: string | null
  tracking_carrier: string | null
  created_at: string
  fulfilled_at: string | null
  customer_address: string
  customer_city: string
  customer_country: string
  customer_zip: string
}

const steps = [
  { key: 'processing', label: 'Order Placed',    icon: Clock,        desc: 'Your order has been received and is being processed.' },
  { key: 'fulfilled',  label: 'Being Prepared',  icon: Package,      desc: 'Your order has been sent to our supplier for fulfillment.' },
  { key: 'shipped',    label: 'Shipped',          icon: Truck,        desc: 'Your order is on its way to you.' },
  { key: 'delivered',  label: 'Delivered',        icon: CheckCircle2, desc: 'Your order has been delivered. Enjoy!' },
]

const stepIndex = (status: string) => {
  const map: Record<string, number> = { processing: 0, fulfilled: 1, shipped: 2, delivered: 3 }
  return map[status] ?? 0
}

export default function TrackOrderPage() {
  const [orderId, setOrderId]   = useState('')
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [order, setOrder]       = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setNotFound(false)
    setOrder(null)

    try {
      const res  = await fetch(`/api/track-order?id=${encodeURIComponent(orderId.trim())}&contact=${encodeURIComponent(email.trim().toLowerCase())}`)
      const data = await res.json()
      if (!res.ok || !data.order) { setNotFound(true) }
      else { setOrder(data.order) }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = order ? stepIndex(order.order_status) : 0
  const isCancelled = order?.order_status === 'cancelled'

  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-brand-600" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink-primary mb-2">Track Your Order</h1>
          <p className="text-ink-secondary text-sm">Enter your order ID and the phone number you used at checkout to see your order status.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleTrack} className="card p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="label">Order ID</label>
              <input
                required
                className="input font-mono"
                placeholder="e.g. A1B2C3D4"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
              />
              <p className="text-xs text-ink-muted mt-1">Shown after you placed the order (8 characters)</p>
            </div>
            <div>
              <label className="label">Phone Number or Email</label>
              <input
                required
                className="input"
                placeholder="01XXXXXXXXX"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Search size={16} /> Track Order</>
              }
            </button>
          </div>
        </form>

        {/* Not found */}
        {notFound && (
          <div className="card p-8 text-center border-red-100">
            <XCircle size={36} className="text-red-400 mx-auto mb-3" />
            <h3 className="font-semibold text-ink-primary mb-1">Order not found</h3>
            <p className="text-sm text-ink-secondary">Please double-check your Order ID and phone number. They must match exactly what you used at checkout.</p>
          </div>
        )}

        {/* Result */}
        {order && (
          <div className="space-y-5">
            {/* Order summary card */}
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-ink-muted mb-1">Order ID</p>
                  <p className="font-mono font-bold text-ink-primary text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize ${
                  isCancelled ? 'bg-red-100 text-red-700' :
                  order.order_status === 'delivered' ? 'bg-green-100 text-green-700' :
                  order.order_status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {order.order_status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm border-t border-surface-200 pt-4">
                <div>
                  <p className="text-ink-muted text-xs mb-0.5">Product</p>
                  <p className="font-medium text-ink-primary">{order.product_name}</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs mb-0.5">Quantity</p>
                  <p className="font-medium text-ink-primary">{order.quantity}</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs mb-0.5">Total Paid</p>
                  <p className="font-bold text-ink-primary">{formatPrice(order.total_price)}</p>
                </div>
                <div>
                  <p className="text-ink-muted text-xs mb-0.5">Order Date</p>
                  <p className="font-medium text-ink-primary">{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Tracking number */}
            {order.tracking_number && (
              <div className="card p-5 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <Truck size={20} className="text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-0.5">Tracking Number</p>
                    <p className="font-mono font-bold text-blue-700 text-lg">{order.tracking_number}</p>
                    {order.tracking_carrier && <p className="text-xs text-blue-600 mt-0.5">via {order.tracking_carrier}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Progress tracker */}
            {!isCancelled && (
              <div className="card p-6">
                <h3 className="font-semibold text-ink-primary mb-6">Order Progress</h3>
                <div className="space-y-0">
                  {steps.map((step, i) => {
                    const done    = i <= currentStep
                    const current = i === currentStep
                    const Icon    = step.icon
                    return (
                      <div key={step.key} className="flex gap-4">
                        {/* Line + dot */}
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            done ? 'bg-brand-600 text-white' : 'bg-surface-100 text-ink-muted'
                          }`}>
                            <Icon size={16} />
                          </div>
                          {i < steps.length - 1 && (
                            <div className={`w-0.5 flex-1 my-1 min-h-[24px] rounded-full transition-colors ${
                              i < currentStep ? 'bg-brand-600' : 'bg-surface-200'
                            }`} />
                          )}
                        </div>
                        {/* Content */}
                        <div className={`pb-5 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
                          <p className={`font-semibold text-sm ${done ? 'text-ink-primary' : 'text-ink-muted'}`}>
                            {step.label}
                            {current && <span className="ml-2 text-xs text-brand-600 font-medium">← Current</span>}
                          </p>
                          <p className={`text-xs mt-0.5 ${done ? 'text-ink-secondary' : 'text-ink-muted'}`}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Shipping address */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={15} className="text-brand-600" />
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Shipping To</p>
              </div>
              <p className="text-sm text-ink-secondary">
                {order.customer_name}<br />
                {order.customer_address}<br />
                {order.customer_city}, {order.customer_zip}<br />
                {order.customer_country}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
