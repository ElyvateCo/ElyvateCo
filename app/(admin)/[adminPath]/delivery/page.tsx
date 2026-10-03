'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrice } from '@/lib/money'

type Zone = { id: string; name: string; charge: number; free_over: number | null; is_active: boolean; sort_order: number }
type Draft = { name: string; charge: string; free_over: string; is_active: boolean }

const emptyDraft: Draft = { name: '', charge: '', free_over: '', is_active: true }

function toDraft(z: Zone): Draft {
  return { name: z.name, charge: String(z.charge), free_over: z.free_over === null ? '' : String(z.free_over), is_active: z.is_active }
}

export default function AdminDelivery() {
  const [zones, setZones] = useState<Zone[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/delivery')
    const data = await res.json()
    if (Array.isArray(data)) {
      setZones(data)
      setDrafts(Object.fromEntries(data.map((z: Zone) => [z.id, toDraft(z)])))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function payload(d: Draft, extra: Record<string, unknown> = {}) {
    return { name: d.name, charge: d.charge === '' ? NaN : Number(d.charge), free_over: d.free_over === '' ? null : Number(d.free_over), is_active: d.is_active, ...extra }
  }

  async function addZone(d: Draft, quiet = false) {
    const res = await fetch('/api/admin/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(d, { sort_order: zones.length })) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Could not add'); return false }
    if (!quiet) toast.success('Delivery area added')
    return true
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    if (await addZone(adding)) { setAdding(emptyDraft); await load() }
    setBusy(false)
  }

  async function addSuggested() {
    setBusy(true)
    await addZone({ name: 'Inside Dhaka', charge: '60', free_over: '', is_active: true }, true)
    await addZone({ name: 'Outside Dhaka', charge: '120', free_over: '', is_active: true }, true)
    await load()
    toast.success('Added two starter areas — change the prices as you like')
    setBusy(false)
  }

  async function save(z: Zone) {
    const d = drafts[z.id]
    const res = await fetch('/api/admin/delivery', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(d, { id: z.id, sort_order: z.sort_order })) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Could not save'); return }
    toast.success('Saved')
    load()
  }

  async function remove(z: Zone) {
    if (!confirm(`Delete "${z.name}"?`)) return
    const res = await fetch(`/api/admin/delivery?id=${z.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Could not delete'); return }
    toast.success('Deleted')
    load()
  }

  const setDraft = (id: string, patch: Partial<Draft>) => setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-primary flex items-center gap-2"><Truck size={22} /> Delivery</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Add your delivery areas and what each one costs. Customers pick their area at checkout and the charge is added to their total.
          With no areas, delivery is free.
        </p>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {zones.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-6 mb-6 text-center">
              <p className="text-sm text-ink-secondary mb-4">No delivery areas yet — delivery is currently free for every order.</p>
              <button onClick={addSuggested} disabled={busy} className="btn-primary disabled:opacity-60">Add &ldquo;Inside Dhaka&rdquo; and &ldquo;Outside Dhaka&rdquo;</button>
            </div>
          )}

          <div className="space-y-3 mb-8">
            {zones.map(z => {
              const d = drafts[z.id] ?? toDraft(z)
              return (
                <div key={z.id} className="bg-white rounded-2xl shadow-card p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label className="label">Area name</label>
                      <input className="input" value={d.name} onChange={e => setDraft(z.id, { name: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Charge (৳)</label>
                      <input className="input" type="number" min="0" inputMode="decimal" value={d.charge} onChange={e => setDraft(z.id, { charge: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Free over (৳)</label>
                      <input className="input" type="number" min="0" inputMode="decimal" placeholder="optional" value={d.free_over} onChange={e => setDraft(z.id, { free_over: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-ink-secondary pb-3">
                        <input type="checkbox" checked={d.is_active} onChange={e => setDraft(z.id, { is_active: e.target.checked })} />
                        Available to customers
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-ink-muted">
                      Now: {formatPrice(z.charge)}{z.free_over !== null ? `, free over ${formatPrice(z.free_over)}` : ''}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => remove(z)} className="p-2 rounded-xl text-red-500 hover:bg-red-50" aria-label="Delete"><Trash2 size={16} /></button>
                      <button onClick={() => save(z)} className="btn-primary !px-4 !py-2 text-sm">Save</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-sm font-semibold text-ink-primary mb-3">Add a delivery area</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <input required className="input" placeholder="e.g. Chattogram city" value={adding.name} onChange={e => setAdding({ ...adding, name: e.target.value })} />
              </div>
              <input required className="input" type="number" min="0" inputMode="decimal" placeholder="Charge ৳" value={adding.charge} onChange={e => setAdding({ ...adding, charge: e.target.value })} />
              <input className="input" type="number" min="0" inputMode="decimal" placeholder="Free over ৳ (optional)" value={adding.free_over} onChange={e => setAdding({ ...adding, free_over: e.target.value })} />
              <button type="submit" disabled={busy} className="btn-outline flex items-center justify-center gap-2 disabled:opacity-60"><Plus size={16} /> Add area</button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
