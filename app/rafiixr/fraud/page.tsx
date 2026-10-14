'use client'
import { useEffect, useState } from 'react'
import FraudCheck from '@/components/admin/FraudCheck'
import { normalizeBDPhone } from '@/lib/phone'
import { fetchJson } from '@/lib/fetchJson'

type Stats = {
  keyConfigured: boolean; cap: number; liveToday: number; checksToday: number; checksAllTime: number; savedNumbers: number
  perStore: { id: string; name: string; subdomain: string; plan: string; used: number }[]
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {hint && <p className="text-[11px] text-ink-muted mt-0.5">{hint}</p>}
    </div>
  )
}

export default function FraudAdminPage() {
  const [s, setS] = useState<Stats | null>(null)
  const [err, setErr] = useState('')
  const [input, setInput] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    fetchJson('/api/rafiixr/fraud').then(r => (r.ok ? setS(r.data as unknown as Stats) : setErr(String(r.data.error || 'Could not load'))))
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const p = normalizeBDPhone(input)
    setPhone('')
    if (p) setTimeout(() => setPhone(p), 0)
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Fraud check</h1>
      <p className="text-sm text-ink-secondary mb-4">
        Each store&apos;s daily limit comes from Plans &amp; features. Results are saved for 24 hours, so the same number is only paid for once.
      </p>

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {s && (
        <>
          {!s.keyConfigured && (
            <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 mb-4">
              <span className="font-semibold">FRAUD_API_KEY is not set.</span> Add it in Vercel (Settings → Environment Variables) and redeploy.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Paid API calls today" value={`${s.liveToday} / ${s.cap}`} hint="your daily cap" />
            <Stat label="Checks today" value={s.checksToday} hint="including saved results" />
            <Stat label="Checks, all time" value={s.checksAllTime} />
            <Stat label="Numbers saved" value={s.savedNumbers} />
          </div>

          <h2 className="font-semibold mb-2">Stores using it today</h2>
          <div className="space-y-2 mb-8">
            {s.perStore.length === 0 && <p className="text-sm text-ink-secondary">No checks yet today.</p>}
            {s.perStore.map(x => (
              <div key={x.id} className="bg-white rounded-2xl shadow-card p-3 flex items-center justify-between">
                <p className="text-sm font-medium truncate">{x.name} <span className="text-ink-muted font-normal">· {x.subdomain}</span></p>
                <p className="text-sm shrink-0"><span className="font-semibold">{x.used}</span> <span className="text-xs text-ink-muted capitalize">· {x.plan}</span></p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="font-semibold mb-2">Check a number</h2>
      <form onSubmit={submit} className="flex gap-2 max-w-md">
        <input className="input" type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit" className="btn-primary shrink-0">Check</button>
      </form>
      <div className="max-w-md">{phone && <FraudCheck key={phone} phone={phone} endpoint="/api/rafiixr/fraud-check" autoRun />}</div>
    </div>
  )
}
