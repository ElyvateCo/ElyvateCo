'use client'
import { useEffect, useState } from 'react'
import { CreditCard, ShieldCheck, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

type Mode = 'sandbox' | 'live'
type Status = { configured: boolean; enabled: boolean; mode: Mode; hint: string }
type Overview = { encryptionReady: boolean; bkash: Status; nagad: Status }

const BKASH_FIELDS = [
  { key: 'username',  label: 'Username',   secret: false },
  { key: 'password',  label: 'Password',   secret: true  },
  { key: 'appKey',    label: 'App Key',    secret: false },
  { key: 'appSecret', label: 'App Secret', secret: true  },
]

function GatewayCard({ provider, status, onChanged }: { provider: 'bkash' | 'nagad'; status: Status; onChanged: () => void }) {
  const label = provider === 'bkash' ? 'bKash' : 'Nagad'
  const [editing, setEditing] = useState(!status.configured)
  const [mode, setMode] = useState<Mode>(status.mode)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => { setEditing(!status.configured); setMode(status.mode) }, [status.configured, status.mode])

  async function send(body: Record<string, unknown>, okMsg: string) {
    setBusy(true)
    const res = await fetch('/api/admin/payment-gateways', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, ...body }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { toast.error(data.error || 'Something went wrong'); return false }
    toast.success(okMsg)
    return true
  }

  async function saveKeys(e: React.FormEvent) {
    e.preventDefault()
    if (await send({ mode, enabled: true, credentials: fields }, `${label} connected`)) {
      setFields({})
      setEditing(false)
      onChanged()
    }
  }

  async function toggle() {
    if (await send({ mode: status.mode, enabled: !status.enabled }, status.enabled ? `${label} switched off` : `${label} switched on`)) onChanged()
  }

  async function changeMode(m: Mode) {
    setMode(m)
    if (await send({ mode: m, enabled: status.enabled }, `Now in ${m} mode`)) onChanged()
  }

  async function disconnect() {
    if (!confirm(`Disconnect ${label}? Your saved keys will be deleted.`)) return
    setBusy(true)
    await fetch(`/api/admin/payment-gateways?provider=${provider}`, { method: 'DELETE' })
    setBusy(false)
    toast.success(`${label} disconnected`)
    onChanged()
  }

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }))
  const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/payments/${provider}/callback` : ''

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-lg text-ink-primary">{label} (automatic)</h2>
          <p className="text-xs text-ink-muted mt-0.5">Customers pay inside the {label} app and the order is marked paid by itself.</p>
        </div>
        {status.configured && (
          <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 ${status.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {status.enabled ? 'On' : 'Off'}
          </span>
        )}
      </div>

      {status.configured && !editing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <ShieldCheck size={16} className="text-green-600" /> Connected · {status.hint || 'keys saved'}
          </div>
          <div>
            <label className="label">Mode</label>
            <select className="input max-w-xs" value={mode} onChange={e => changeMode(e.target.value as Mode)} disabled={busy}>
              <option value="sandbox">Sandbox (testing — no real money)</option>
              <option value="live">Live (real payments)</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={toggle} disabled={busy} className="btn-primary !px-4 !py-2 text-sm disabled:opacity-60">{status.enabled ? 'Switch off' : 'Switch on'}</button>
            <button onClick={() => setEditing(true)} disabled={busy} className="btn-outline !px-4 !py-2 text-sm">Replace keys</button>
            <button onClick={disconnect} disabled={busy} className="px-4 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50">Disconnect</button>
          </div>
        </div>
      ) : (
        <form onSubmit={saveKeys} className="space-y-3">
          <div>
            <label className="label">Mode</label>
            <select className="input max-w-xs" value={mode} onChange={e => setMode(e.target.value as Mode)}>
              <option value="sandbox">Sandbox (testing — no real money)</option>
              <option value="live">Live (real payments)</option>
            </select>
          </div>

          {provider === 'bkash' ? (
            BKASH_FIELDS.map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input required className="input" type={f.secret ? 'password' : 'text'} autoComplete="off" value={fields[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
              </div>
            ))
          ) : (
            <>
              <div>
                <label className="label">Merchant ID</label>
                <input required className="input" autoComplete="off" value={fields.merchantId ?? ''} onChange={e => set('merchantId', e.target.value)} />
              </div>
              <div>
                <label className="label">Merchant number</label>
                <input required className="input" type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" value={fields.merchantNumber ?? ''} onChange={e => set('merchantNumber', e.target.value)} />
              </div>
              <div>
                <label className="label">Your private key</label>
                <textarea required rows={4} className="input font-mono text-xs" autoComplete="off" placeholder="Paste your merchant private key" value={fields.merchantPrivateKey ?? ''} onChange={e => set('merchantPrivateKey', e.target.value)} />
              </div>
              <div>
                <label className="label">Nagad&apos;s public key</label>
                <textarea required rows={4} className="input font-mono text-xs" autoComplete="off" placeholder="Paste the public key Nagad gave you" value={fields.pgPublicKey ?? ''} onChange={e => set('pgPublicKey', e.target.value)} />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">{busy ? 'Checking…' : `Save ${label} keys`}</button>
            {status.configured && <button type="button" onClick={() => setEditing(false)} className="btn-outline">Cancel</button>}
          </div>
          <p className="text-xs text-ink-muted">
            Keys are encrypted before they are saved and are never shown again.
            {provider === 'bkash' && ' bKash checks them with a test sign-in before saving.'}
          </p>
        </form>
      )}

      <div className="mt-4 pt-4 border-t border-surface-200">
        <p className="text-xs text-ink-muted">
          If {label} asks for your callback / return URL, use: <span className="font-mono break-all text-ink-secondary">{callbackUrl}</span>
        </p>
      </div>
    </div>
  )
}

export default function AdminPayments() {
  const [data, setData] = useState<Overview | null>(null)

  async function load() {
    const res = await fetch('/api/admin/payment-gateways')
    if (res.ok) setData(await res.json())
  }
  useEffect(() => { load() }, [])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-primary flex items-center gap-2"><CreditCard size={22} /> Online Payments</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Connect your own bKash or Nagad <strong>merchant</strong> account so customers can pay online and orders are confirmed automatically.
          No merchant account yet? Use the simple &ldquo;send money + TrxID&rdquo; option in Settings → Payment Methods.
        </p>
      </div>

      {!data ? (
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {!data.encryptionReady && (
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Online payments are not switched on for this platform yet, so keys can&apos;t be saved safely.
                Platform owner: add the environment variable <span className="font-mono">PAYMENT_SECRET_KEY</span> (64 random hex characters) in Vercel, then redeploy.
              </p>
            </div>
          )}
          <GatewayCard provider="bkash" status={data.bkash} onChanged={load} />
          <GatewayCard provider="nagad" status={data.nagad} onChanged={load} />
        </>
      )}
    </div>
  )
}
