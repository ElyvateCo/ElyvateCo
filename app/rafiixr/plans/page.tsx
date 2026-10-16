'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchJson } from '@/lib/fetchJson'

type Plan = 'free' | 'pro' | 'business'
type Feature = {
  key: string; label: string; description: string; kind: 'flag' | 'limit'; enabled: boolean; min_plan: Plan
  free_limit: number | null; pro_limit: number | null; business_limit: number | null
}

const val = (n: number | null) => (n === null ? '' : String(n))

function FeatureCard({ f, onSaved }: { f: Feature; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(f.enabled)
  const [minPlan, setMinPlan] = useState<Plan>(f.min_plan)
  const [free, setFree] = useState(val(f.free_limit))
  const [pro, setPro] = useState(val(f.pro_limit))
  const [business, setBusiness] = useState(val(f.business_limit))
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const r = await fetchJson('/api/rafiixr/features', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: f.key, enabled, min_plan: minPlan, free_limit: free, pro_limit: pro, business_limit: business }),
    })
    setBusy(false)
    if (!r.ok) { toast.error(String(r.data.error || 'Could not save')); return }
    toast.success(`${f.label} saved`)
    onSaved()
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{f.label}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{f.description}</p>
        </div>
        {f.kind === 'flag' && (
          <label className="flex items-center gap-2 text-xs text-ink-secondary shrink-0">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            {enabled ? 'On' : 'Off for everyone'}
          </label>
        )}
      </div>

      {f.kind === 'flag' ? (
        <div className="mt-3">
          <label className="label">Included from</label>
          <select className="input max-w-xs" value={minPlan} onChange={e => setMinPlan(e.target.value as Plan)}>
            <option value="free">Free (every store)</option>
            <option value="pro">Pro and Business</option>
            <option value="business">Business only</option>
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[['Free', free, setFree], ['Pro', pro, setPro], ['Business', business, setBusiness]].map(([label, v, set]) => (
            <div key={label as string}>
              <label className="label">{label as string}</label>
              <input className="input" type="number" min="0" inputMode="numeric" placeholder="Unlimited" value={v as string} onChange={e => (set as (x: string) => void)(e.target.value)} />
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={busy} className="btn-primary !px-5 !py-2 text-sm mt-4 disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
    </div>
  )
}

function TrialCard() {
  const [enabled, setEnabled] = useState(false)
  const [days, setDays] = useState('14')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchJson('/api/rafiixr/settings').then(r => {
      const t = r.data.trial as { enabled: boolean; days: number } | undefined
      if (r.ok && t) { setEnabled(t.enabled); setDays(String(t.days)); setReady(true) }
    })
  }, [])

  async function save(next: { enabled?: boolean; days?: string }) {
    setBusy(true)
    const r = await fetchJson('/api/rafiixr/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next.enabled ?? enabled, days: next.days ?? days }),
    })
    setBusy(false)
    if (!r.ok) { toast.error(String(r.data.error || 'Could not save')); return }
    if (next.enabled !== undefined) setEnabled(next.enabled)
    toast.success(next.enabled !== undefined ? (next.enabled ? 'Free trial is ON' : 'Free trial is OFF') : 'Trial length saved')
  }

  if (!ready) return null
  return (
    <div className={`rounded-2xl shadow-card p-4 mb-5 border-2 ${enabled ? 'bg-green-50 border-green-200' : 'bg-white border-surface-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Free trial · {enabled ? 'ON' : 'OFF'}</p>
          <p className="text-xs text-ink-secondary mt-0.5">
            {enabled ? 'Every new store starts a Pro trial, and stores with an active trial get Pro features.' : 'New stores get no trial, and trials give no Pro features.'}
          </p>
        </div>
        <button onClick={() => save({ enabled: !enabled })} disabled={busy}
          className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 ${enabled ? 'bg-white text-red-600 border border-red-200' : 'bg-brand-600 text-white'}`}>
          {enabled ? 'Turn OFF' : 'Turn ON'}
        </button>
      </div>
      <div className="flex items-end gap-2 mt-3">
        <div>
          <label className="label">Trial length (days)</label>
          <input className="input !w-28" type="number" min="1" max="365" value={days} onChange={e => setDays(e.target.value)} />
        </div>
        <button onClick={() => save({ days })} disabled={busy} className="btn-outline !px-4 !py-2.5 text-sm">Save</button>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    fetchJson('/api/rafiixr/features').then(r => {
      if (r.ok && Array.isArray(r.data)) setFeatures(r.data as unknown as Feature[])
      setLoading(false)
    })
  }, [version])

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Plans &amp; features</h1>
      <p className="text-sm text-ink-secondary mb-5">
        Choose what each plan gets. Changes apply to every store within seconds. Leave a limit empty for unlimited.
      </p>
      <TrialCard />
      {loading ? (
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="space-y-3">
          {features.map(f => <FeatureCard key={`${f.key}-${version}`} f={f} onSaved={() => setVersion(v => v + 1)} />)}
        </div>
      )}
    </div>
  )
}
