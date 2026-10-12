'use client'
import { useEffect, useState } from 'react'
import { Users, Search } from 'lucide-react'
import { formatPrice } from '@/lib/money'

type Customer = {
  key: string; name: string | null; email: string | null; phone: string | null
  hasAccount: boolean; joined: string | null; orders: number; spent: number; lastOrder: string | null
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/admin/customers')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setCustomers(d) })
      .finally(() => setLoading(false))
  }, [])

  const needle = q.trim().toLowerCase()
  const shown = needle
    ? customers.filter(c => [c.name, c.email, c.phone].some(v => v?.toLowerCase().includes(needle)))
    : customers
  const withAccount = customers.filter(c => c.hasAccount).length

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-primary flex items-center gap-2"><Users size={22} /> Customers</h1>
        <p className="text-sm text-ink-secondary mt-1">
          {customers.length} customers · {withAccount} with an account. Everyone who signed up or ordered on your store — and only your store.
        </p>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input className="input pl-11" placeholder="Search name, email or phone" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center text-sm text-ink-secondary">
          {customers.length === 0 ? 'No customers yet. They appear here when someone signs up or places an order.' : 'No match.'}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(c => (
            <div key={c.key} className="bg-white rounded-2xl shadow-card p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink-primary truncate">{c.name || c.email || c.phone}</p>
                <p className="text-xs text-ink-secondary mt-0.5 break-all">
                  {[c.email, c.phone].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.hasAccount && <span className="text-[11px] font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">Has account</span>}
                  {c.orders > 1 && <span className="text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Repeat buyer</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-ink-primary">{formatPrice(c.spent)}</p>
                <p className="text-xs text-ink-muted">{c.orders} order{c.orders === 1 ? '' : 's'}</p>
                {c.lastOrder && <p className="text-[11px] text-ink-muted mt-0.5">Last: {new Date(c.lastOrder).toLocaleDateString()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
