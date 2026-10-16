'use client'
import { useEffect, useState } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchJson } from '@/lib/fetchJson'

type Store = {
  id: string; name: string; subdomain: string; plan: 'free' | 'pro' | 'business'; status: 'active' | 'suspended'
  trialEndsAt: string | null; createdAt: string; owner: string; products: number; orders: number; url: string
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [trial, setTrial] = useState<{ enabled: boolean; days: number }>({ enabled: false, days: 14 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  async function load() {
    const r = await fetchJson('/api/rafiixr/stores')
    if (r.ok && Array.isArray(r.data.stores)) {
      setStores(r.data.stores as Store[])
      setTrial(r.data.trial as { enabled: boolean; days: number })
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function change(id: string, patch: Record<string, unknown>, ok: string) {
    const r = await fetchJson('/api/rafiixr/stores', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }),
    })
    if (!r.ok) { toast.error(String(r.data.error || 'Could not save')); return }
    toast.success(ok)
    load()
  }

  const needle = q.trim().toLowerCase()
  const shown = needle ? stores.filter(s => [s.name, s.subdomain, s.owner].some(v => v.toLowerCase().includes(needle))) : stores
  const onTrial = (s: Store) => trial.enabled && s.plan === 'free' && s.trialEndsAt && new Date(s.trialEndsAt).getTime() > Date.now()

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Stores</h1>
      <p className="text-sm text-ink-secondary mb-4">
        {stores.length} stores on Elyvate. Free trial is <span className="font-semibold">{trial.enabled ? 'ON' : 'OFF'}</span>
        {!trial.enabled && ' — trials give no Pro features. Turn it on in Plans & features.'}
      </p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input className="input pl-11" placeholder="Search store, address or owner email" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="space-y-3">
          {shown.map(s => (
            <div key={s.id} className={`bg-white rounded-2xl shadow-card p-4 ${s.status === 'suspended' ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{s.name} <span className="text-ink-muted font-normal text-sm">· {s.subdomain}</span></p>
                  <p className="text-xs text-ink-secondary truncate">{s.owner || 'no email'}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {s.products} products · {s.orders} orders · joined {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a href={s.url} target="_blank" rel="noreferrer" className="p-2 rounded-xl text-ink-secondary hover:bg-surface-100 shrink-0" aria-label="Open store"><ExternalLink size={16} /></a>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <select className="input !w-auto !py-2 text-sm" value={s.plan} onChange={e => change(s.id, { plan: e.target.value }, `Plan changed to ${e.target.value}`)}>
                  <option value="free">Free</option><option value="pro">Pro</option><option value="business">Business</option>
                </select>
                {onTrial(s) && <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Pro trial until {new Date(s.trialEndsAt as string).toLocaleDateString()}</span>}
                {s.status === 'suspended' && <span className="text-[11px] font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Suspended</span>}
                <button onClick={() => change(s.id, { trialDays: onTrial(s) ? 0 : trial.days }, onTrial(s) ? 'Trial ended' : `${trial.days}-day Pro trial started`)} className="text-xs px-3 py-2 rounded-xl bg-surface-100 hover:bg-surface-200">
                  {onTrial(s) ? 'End trial' : `Give ${trial.days}-day trial`}
                </button>
                <button
                  onClick={() => {
                    if (s.status === 'active' && !confirm(`Suspend ${s.name}? Its storefront and checkout stop working.`)) return
                    change(s.id, { status: s.status === 'active' ? 'suspended' : 'active' }, s.status === 'active' ? 'Store suspended' : 'Store reactivated')
                  }}
                  className={`text-xs px-3 py-2 rounded-xl ${s.status === 'active' ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-700 bg-green-50 hover:bg-green-100'}`}
                >
                  {s.status === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="text-sm text-ink-secondary">No stores match.</p>}
        </div>
      )}
    </div>
  )
}
