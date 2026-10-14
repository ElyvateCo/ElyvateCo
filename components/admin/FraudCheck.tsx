'use client'
import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2 } from 'lucide-react'
import { fetchJson } from '@/lib/fetchJson'

type Courier = { id: string; name: string; found: boolean; total: number; success: number; cancel: number; deliveredPercentage: number }
type Result = { verdict: 'none' | 'good' | 'warning' | 'risky'; label: string; total: number; success: number; cancel: number; rate: number | null; couriers: Courier[] }
export type Usage = { used: number; limit: number | null }

const STYLE = {
  good:    { box: 'bg-green-50 border-green-200 text-green-800',  icon: ShieldCheck },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-800',  icon: ShieldAlert },
  risky:   { box: 'bg-red-50 border-red-200 text-red-800',        icon: ShieldAlert },
  none:    { box: 'bg-surface-100 border-surface-200 text-ink-secondary', icon: ShieldQuestion },
}

// Checks one phone number's courier delivery history. Used on each order and
// on the "Fraud check" pages (the endpoint differs for the main admin).
export default function FraudCheck({ phone, endpoint = '/api/admin/fraud-check', autoRun = false, onUsage }: {
  phone: string; endpoint?: string; autoRun?: boolean; onUsage?: (u: Usage) => void
}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [cached, setCached] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true); setError('')
    const r = await fetchJson(`${endpoint}?phone=${encodeURIComponent(phone)}`, {}, 25000)
    setLoading(false)
    if (r.data.usage && onUsage) onUsage(r.data.usage as Usage)
    if (!r.ok) { setError(String(r.data.error || 'Could not check this number')); return }
    setResult(r.data.result as Result)
    setCached(r.data.cached === true)
  }

  useEffect(() => { if (autoRun) run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) {
    return (
      <div className="mt-2">
        {!autoRun && (
          <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Check this customer
          </button>
        )}
        {autoRun && loading && <p className="text-sm text-ink-secondary flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Checking…</p>}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    )
  }

  const st = STYLE[result.verdict]
  const Icon = st.icon
  const rows = result.couriers.filter(c => c.found || c.total > 0)

  return (
    <div className={`mt-2 border rounded-2xl p-3 ${st.box}`}>
      <p className="font-semibold text-sm flex items-center gap-2"><Icon size={16} /> {result.label}</p>
      <p className="text-xs mt-1">
        {result.total === 0
          ? 'No courier has a record for this number. That is normal for a new customer.'
          : `${result.total} parcels · ${result.success} delivered · ${result.cancel} cancelled${result.rate !== null ? ` · ${result.rate}% success` : ''}`}
      </p>
      {rows.length > 0 && (
        <div className="mt-2 bg-white/70 rounded-xl overflow-hidden text-xs text-ink-primary">
          <div className="grid grid-cols-4 px-3 py-1.5 font-semibold text-ink-secondary"><span>Courier</span><span className="text-right">Parcels</span><span className="text-right">Delivered</span><span className="text-right">Cancelled</span></div>
          {rows.map(c => (
            <div key={c.id} className="grid grid-cols-4 px-3 py-1.5 border-t border-surface-200">
              <span>{c.name}</span><span className="text-right">{c.total}</span><span className="text-right">{c.success}</span><span className="text-right">{c.cancel}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] mt-2 opacity-80">Based on courier records{cached ? ' (saved from the last 24 hours)' : ''}. Use it as guidance, not proof.</p>
    </div>
  )
}
