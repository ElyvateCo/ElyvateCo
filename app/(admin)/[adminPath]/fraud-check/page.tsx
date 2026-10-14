'use client'
import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import FraudCheck, { type Usage } from '@/components/admin/FraudCheck'
import { normalizeBDPhone } from '@/lib/phone'
import { fetchJson } from '@/lib/fetchJson'

export default function FraudCheckPage() {
  const [input, setInput] = useState('')
  const [phone, setPhone] = useState('')
  const [usage, setUsage] = useState<Usage | null>(null)
  const [bad, setBad] = useState(false)

  useEffect(() => {
    fetchJson('/api/admin/fraud-check').then(r => { if (r.ok && r.data.usage) setUsage(r.data.usage as Usage) })
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const p = normalizeBDPhone(input)
    setBad(!p)
    setPhone('')
    if (p) setTimeout(() => setPhone(p), 0)   // remount so every press runs a fresh check
  }

  const left = usage && usage.limit !== null ? Math.max(usage.limit - usage.used, 0) : null

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold flex items-center gap-2 mb-1"><ShieldCheck size={22} /> Fraud check</h1>
      <p className="text-sm text-ink-secondary mb-4">
        Look up a customer&apos;s courier delivery history before you ship. {usage && (usage.limit === null
          ? `Unlimited checks on your plan (${usage.used} used today).`
          : `${left} of ${usage.limit} checks left today.`)}
      </p>

      <form onSubmit={submit} className="flex gap-2">
        <input className="input" type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit" className="btn-primary shrink-0">Check</button>
      </form>
      {bad && <p className="text-xs text-red-600 mt-2">Enter a valid mobile number, like 01712345678.</p>}

      {phone && <FraudCheck key={phone} phone={phone} autoRun onUsage={setUsage} />}
    </div>
  )
}
