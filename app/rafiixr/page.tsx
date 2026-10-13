'use client'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/money'
import { fetchJson } from '@/lib/fetchJson'

type Overview = {
  stores: number; newStores: number; users: number; orders: number; products: number; customers: number; paidSales: number
  plans: { free: number; pro: number; business: number; trial: number; suspended: number }
  recent: { id: string; name: string; subdomain: string; plan: string; createdAt: string; owner: string }[]
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-2xl font-bold text-ink-primary mt-1">{value}</p>
      {hint && <p className="text-[11px] text-ink-muted mt-0.5">{hint}</p>}
    </div>
  )
}

export default function Overview() {
  const [d, setD] = useState<Overview | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchJson('/api/rafiixr/overview').then(r => (r.ok ? setD(r.data as unknown as Overview) : setErr(String(r.data.error || 'Could not load'))))
  }, [])

  if (err) return <p className="text-sm text-red-600">{err}</p>
  if (!d) return <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-5">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Stat label="Stores" value={d.stores} hint={`${d.newStores} new this week`} />
        <Stat label="Accounts" value={d.users} />
        <Stat label="Orders" value={d.orders} />
        <Stat label="Paid sales" value={formatPrice(d.paidSales)} hint="all stores, confirmed payments" />
        <Stat label="Products" value={d.products} />
        <Stat label="Shoppers with accounts" value={d.customers} />
      </div>

      <h2 className="font-semibold mb-2">Plans</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Free" value={d.plans.free} />
        <Stat label="On trial" value={d.plans.trial} />
        <Stat label="Pro" value={d.plans.pro} />
        <Stat label="Business" value={d.plans.business} />
        <Stat label="Suspended" value={d.plans.suspended} />
      </div>

      <h2 className="font-semibold mb-2">Newest stores</h2>
      <div className="space-y-2">
        {d.recent.map(s => (
          <div key={s.id} className="bg-white rounded-2xl shadow-card p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{s.name} <span className="text-ink-muted font-normal">· {s.subdomain}</span></p>
              <p className="text-xs text-ink-muted truncate">{s.owner || 'no email'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold capitalize">{s.plan}</p>
              <p className="text-[11px] text-ink-muted">{new Date(s.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
