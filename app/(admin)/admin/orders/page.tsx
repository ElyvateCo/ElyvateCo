'use client'
import { useEffect, useState } from 'react'
import type { Order } from '@/lib/supabase'
import { Package, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTIONS: Order['order_status'][] = ['processing', 'fulfilled', 'shipped', 'delivered', 'cancelled']

const CARRIERS = ['DHL', 'FedEx', 'UPS', 'USPS', 'Royal Mail', 'Australia Post', 'China Post', 'YunExpress', 'Other']

const statusStyle = (s: string) => {
  if (s === 'delivered') return 'bg-green-100 text-green-700'
  if (s === 'shipped')   return 'bg-blue-100 text-blue-700'
  if (s === 'fulfilled') return 'bg-purple-100 text-purple-700'
  if (s === 'cancelled') return 'bg-red-100 text-red-600'
  return 'bg-amber-100 text-amber-700'
}

const statusIcon = (s: string) => {
  if (s === 'delivered') return <CheckCircle2 size={13} />
  if (s === 'shipped')   return <Truck size={13} />
  if (s === 'fulfilled') return <Package size={13} />
  if (s === 'cancelled') return <XCircle size={13} />
  return <Clock size={13} />
}

type FulfillForm = { tracking_number: string; tracking_carrier: string; supplier_order_id: string; notes: string }

export default function AdminOrders() {
  const [orders, setOrders]     = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter]     = useState<string>('all')
  const [fulfillForms, setFulfillForms] = useState<Record<string, FulfillForm>>({})
  const [saving, setSaving]     = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/admin/orders')
    const data = await res.json()
    setOrders(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load() }, [])

  function getForm(id: string): FulfillForm {
    return fulfillForms[id] ?? { tracking_number: '', tracking_carrier: 'DHL', supplier_order_id: '', notes: '' }
  }
  function setForm(id: string, patch: Partial<FulfillForm>) {
    setFulfillForms(f => ({ ...f, [id]: { ...getForm(id), ...patch } }))
  }

  async function handleFulfill(order: Order) {
    const form = getForm(order.id)
    if (!form.tracking_number.trim()) { toast.error('Please enter a tracking number'); return }
    setSaving(order.id)
    try {
      const res = await fetch('/api/admin/orders/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, ...form, customerEmail: order.customer_email, customerName: order.customer_name, productName: order.product_name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Order marked as shipped! Customer notified.')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fulfill order')
    } finally { setSaving(null) }
  }

  async function updateStatus(id: string, status: Order['order_status']) {
    await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, order_status: status }) })
    toast.success('Status updated')
    load()
  }

  // There was previously no way to actually mark an order as paid anywhere
  // in the admin panel — payment_status could only ever be displayed, never
  // changed. Needed for both bank-transfer orders and the new manual
  // crypto-verification flow.
  async function updatePaymentStatus(id: string, status: Order['payment_status']) {
    await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, payment_status: status }) })
    toast.success(status === 'paid' ? 'Marked as paid' : 'Payment status updated')
    load()
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.order_status === filter)
  const counts   = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: orders.filter(o => o.order_status === s).length }), {} as Record<string, number>)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-ink-muted">{orders.length} total</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', ...STATUS_OPTIONS] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
            filter === s ? 'bg-brand-600 text-white' : 'bg-white text-ink-secondary hover:bg-surface-100 shadow-card'
          }`}>
            {s !== 'all' && statusIcon(s)} {s}
            {s !== 'all' && counts[s] > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${filter === s ? 'bg-white/20' : 'bg-surface-200 text-ink-muted'}`}>{counts[s]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center">
          <Package size={32} className="text-surface-300 mx-auto mb-3" />
          <p className="text-ink-muted text-sm">No orders here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const form   = getForm(o.id)
            const isOpen = expanded === o.id
            const isSaving = saving === o.id
            const needsFulfillment = o.order_status === 'processing' && o.payment_status === 'paid'

            return (
              <div key={o.id} className={`bg-white rounded-2xl shadow-card overflow-hidden ${needsFulfillment ? 'ring-2 ring-amber-400' : ''}`}>
                {/* Row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-surface-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-ink-muted">#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-medium capitalize ${statusStyle(o.order_status)}`}>
                        {statusIcon(o.order_status)} {o.order_status}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-xl text-xs font-medium ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : o.payment_status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {o.payment_status}
                      </span>
                      {o.payment_method === 'crypto_usdt' && (
                        <span className="px-2.5 py-0.5 rounded-xl text-xs font-medium bg-purple-100 text-purple-700">
                          USDT{o.payment_status === 'pending' ? ' — verify manually' : ''}
                        </span>
                      )}
                      {needsFulfillment && <span className="px-2 py-0.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">Needs Fulfillment</span>}
                    </div>
                    <p className="font-medium text-sm text-ink-primary truncate">{o.customer_name} — {o.product_name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{new Date(o.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <p className="font-bold text-ink-primary">${o.total_price.toFixed(2)}</p>
                      <p className="text-xs text-ink-muted">Qty: {o.quantity}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
                  </div>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-surface-200 bg-surface-50 p-5 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {/* Customer */}
                      <div>
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Customer</p>
                        <div className="text-sm text-ink-secondary space-y-1">
                          <p className="font-semibold text-ink-primary">{o.customer_name}</p>
                          <p>{o.customer_email}</p>
                          <p>{o.customer_phone}</p>
                        </div>
                      </div>
                      {/* Shipping */}
                      <div>
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Ship To</p>
                        <div className="text-sm text-ink-secondary space-y-0.5">
                          <p>{o.customer_address}</p>
                          <p>{o.customer_city}, {o.customer_zip}</p>
                          <p className="font-semibold text-ink-primary">{o.customer_country}</p>
                        </div>
                        <button onClick={() => { if (!navigator.clipboard) { toast.error('Copy not available'); return } navigator.clipboard.writeText(`${o.customer_name}\n${o.customer_address}\n${o.customer_city}, ${o.customer_zip}\n${o.customer_country}`); toast.success('Address copied!') }} className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline mt-2">
                          <Copy size={11} /> Copy address
                        </button>
                      </div>
                      {/* Order info */}
                      <div>
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Order Info</p>
                        <div className="text-sm space-y-1">
                          <p className="text-ink-secondary">Product: <span className="text-ink-primary font-medium">{o.product_name}</span></p>
                          <p className="text-ink-secondary">Qty: <span className="text-ink-primary font-medium">{o.quantity}</span></p>
                          <p className="text-ink-secondary">Total: <span className="text-ink-primary font-bold">${o.total_price.toFixed(2)}</span></p>
                          {o.coupon_code && <p className="text-green-600 text-xs">Coupon: {o.coupon_code}</p>}
                          {o.payment_method === 'crypto_usdt' && (
                            <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                              <p className="text-purple-800 font-semibold text-xs mb-1">USDT Payment</p>
                              <p className="text-purple-700 text-xs">Amount: <strong>{o.crypto_amount?.toFixed(2)} USDT</strong></p>
                              <p className="text-purple-700 text-xs">Network: <strong>{o.crypto_network}</strong></p>
                              <p className="text-purple-700 text-xs">Reference: <strong>#{o.id.slice(0, 8).toUpperCase()}</strong></p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Supplier links */}
                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Place Order On Supplier</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'CJ Dropshipping', url: 'https://cjdropshipping.com' },
                          { label: 'AliExpress', url: 'https://aliexpress.com' },
                          { label: 'Zendrop', url: 'https://zendrop.com' },
                        ].map(({ label, url }) => (
                          <a key={label} href={url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs px-3 py-2 bg-white rounded-xl border border-surface-300 hover:border-brand-400 hover:text-brand-600 transition-colors">
                            <ExternalLink size={11} /> {label}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Fulfillment form */}
                    {o.order_status !== 'cancelled' && o.order_status !== 'delivered' && (
                      <div className="bg-white rounded-2xl p-5 border border-surface-200">
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Fulfillment</p>

                        {/* Show existing tracking if already shipped */}
                        {o.tracking_number ? (
                          <div className="space-y-2 mb-4 p-3 bg-blue-50 rounded-xl">
                            <p className="text-xs font-semibold text-blue-800">Already Shipped</p>
                            <p className="text-sm font-mono text-blue-700">{o.tracking_number} <span className="text-xs text-blue-500">via {o.tracking_carrier}</span></p>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="label text-xs">Tracking Number *</label>
                            <input className="input text-sm font-mono" placeholder="e.g. DHL1234567890" value={form.tracking_number} onChange={e => setForm(o.id, { tracking_number: e.target.value })} />
                          </div>
                          <div>
                            <label className="label text-xs">Carrier</label>
                            <select className="input text-sm" value={form.tracking_carrier} onChange={e => setForm(o.id, { tracking_carrier: e.target.value })}>
                              {CARRIERS.map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label text-xs">Supplier Order ID (optional)</label>
                            <input className="input text-sm" placeholder="e.g. CJ-123456" value={form.supplier_order_id} onChange={e => setForm(o.id, { supplier_order_id: e.target.value })} />
                          </div>
                          <div>
                            <label className="label text-xs">Internal Note (optional)</label>
                            <input className="input text-sm" placeholder="Any notes..." value={form.notes} onChange={e => setForm(o.id, { notes: e.target.value })} />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleFulfill(o)}
                            disabled={!!isSaving}
                            className="btn-primary flex items-center gap-2 text-sm py-2.5"
                          >
                            {isSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Truck size={14} />}
                            Mark as Shipped & Notify Customer
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Payment status — the key manual-verification action for
                        both bank transfer and crypto orders */}
                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Payment Status</p>
                      <div className="flex flex-wrap gap-2">
                        {(['pending', 'paid', 'failed'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => updatePaymentStatus(o.id, s)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors border ${
                              o.payment_status === s
                                ? s === 'paid' ? 'bg-green-100 text-green-700 border-current' : s === 'failed' ? 'bg-red-100 text-red-600 border-current' : 'bg-gray-100 text-gray-600 border-current'
                                : 'bg-white border-surface-300 text-ink-secondary hover:border-surface-400'
                            }`}
                          >
                            {s === 'paid' && <CheckCircle2 size={12} />}
                            {s === 'paid' ? 'Mark as Paid' : s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status update */}
                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(s => (
                          <button key={s} onClick={() => updateStatus(o.id, s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors border ${
                            o.order_status === s ? `${statusStyle(s)} border-current` : 'bg-white border-surface-300 text-ink-secondary hover:border-surface-400'
                          }`}>
                            {statusIcon(s)} {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
