'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchJson } from '@/lib/fetchJson'
import { ICON_KEYS, type LandingContent } from '@/lib/landingDefaults'

function Field({ label, value, onChange, max, area }: { label: string; value: string; onChange: (v: string) => void; max?: number; area?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      {area
        ? <textarea className="input" rows={3} maxLength={max} value={value} onChange={e => onChange(e.target.value)} />
        : <input className="input" maxLength={max} value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  )
}

function Card({ title, show, onShow, children }: { title: string; show?: boolean; onShow?: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold">{title}</h2>
        {onShow && (
          <label className="flex items-center gap-2 text-xs text-ink-secondary">
            <input type="checkbox" checked={show} onChange={e => onShow(e.target.checked)} /> Show on page
          </label>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ItemBar({ i, n, move, remove }: { i: number; n: number; move: (d: -1 | 1) => void; remove: () => void }) {
  const b = 'p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30'
  return (
    <div className="flex gap-1 justify-end">
      <button type="button" className={b} disabled={i === 0} onClick={() => move(-1)} aria-label="Move up"><ArrowUp size={14} /></button>
      <button type="button" className={b} disabled={i === n - 1} onClick={() => move(1)} aria-label="Move down"><ArrowDown size={14} /></button>
      <button type="button" className={`${b} text-red-500`} onClick={remove} aria-label="Remove"><Trash2 size={14} /></button>
    </div>
  )
}

export default function LandingEditor() {
  const [c, setC] = useState<LandingContent | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchJson('/api/rafiixr/landing').then(r => { if (r.ok) setC(r.data as unknown as LandingContent) })
  }, [])

  if (!c) return <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />

  // edit a copy of the content
  const edit = (fn: (n: LandingContent) => void) => setC(prev => { const n = JSON.parse(JSON.stringify(prev)) as LandingContent; fn(n); return n })
  const swap = <T,>(list: T[], i: number, d: -1 | 1) => { const j = i + d; if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]] }

  async function save() {
    setBusy(true)
    const r = await fetchJson('/api/rafiixr/landing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
    setBusy(false)
    if (!r.ok) { toast.error(String(r.data.error || 'Could not save')); return }
    setC(r.data.content as LandingContent)
    toast.success('Landing page saved — it is live now')
  }

  async function reset() {
    if (!confirm('Go back to the original landing page text? Your edits will be lost.')) return
    await fetchJson('/api/rafiixr/landing', { method: 'DELETE' })
    const r = await fetchJson('/api/rafiixr/landing')
    if (r.ok) setC(r.data as unknown as LandingContent)
    toast.success('Back to the original text')
  }

  return (
    <div className="pb-24">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Landing page</h1>
          <p className="text-sm text-ink-secondary mt-1">Edit what visitors see at the top of your site. Text only — the live store demo and animations stay.</p>
        </div>
        <a href="/welcome" target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl bg-white shadow-card"><ExternalLink size={14} /> Open</a>
      </div>

      <Card title="Top section">
        <Field label="Small badge" value={c.hero.badge} max={60} onChange={v => edit(n => { n.hero.badge = v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Headline" value={c.hero.headline} max={90} onChange={v => edit(n => { n.hero.headline = v })} />
          <Field label="Coloured end of headline" value={c.hero.highlight} max={40} onChange={v => edit(n => { n.hero.highlight = v })} />
        </div>
        <Field label="Sub-text" area value={c.hero.subtitle} max={300} onChange={v => edit(n => { n.hero.subtitle = v })} />
        <Field label="Payment chips (comma separated)" value={c.hero.chips.join(', ')} onChange={v => edit(n => { n.hero.chips = v.split(',').map(x => x.trim()).filter(Boolean).slice(0, 6) })} />
        <Field label="Small note under the buttons" value={c.hero.note} max={80} onChange={v => edit(n => { n.hero.note = v })} />
      </Card>

      <Card title="Features" show={c.features.show} onShow={v => edit(n => { n.features.show = v })}>
        <Field label="Title" value={c.features.title} max={100} onChange={v => edit(n => { n.features.title = v })} />
        <Field label="Sub-title" value={c.features.subtitle} max={160} onChange={v => edit(n => { n.features.subtitle = v })} />
        {c.features.items.map((it, i) => (
          <div key={i} className="border border-surface-200 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Icon</label>
                <select className="input" value={it.icon} onChange={e => edit(n => { n.features.items[i].icon = e.target.value as never })}>
                  {ICON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <Field label="Badge (optional)" value={it.badge} max={20} onChange={v => edit(n => { n.features.items[i].badge = v })} />
            </div>
            <Field label="Title" value={it.title} max={60} onChange={v => edit(n => { n.features.items[i].title = v })} />
            <Field label="Text" area value={it.text} max={220} onChange={v => edit(n => { n.features.items[i].text = v })} />
            <ItemBar i={i} n={c.features.items.length} move={d => edit(n => swap(n.features.items, i, d))} remove={() => edit(n => { n.features.items.splice(i, 1) })} />
          </div>
        ))}
        {c.features.items.length < 12 && (
          <button type="button" className="btn-outline !py-2 text-sm inline-flex items-center gap-1.5" onClick={() => edit(n => { n.features.items.push({ icon: 'store', title: 'New feature', text: '', badge: '' }) })}><Plus size={14} /> Add feature</button>
        )}
      </Card>

      <Card title="How it works" show={c.how.show} onShow={v => edit(n => { n.how.show = v })}>
        <Field label="Title" value={c.how.title} max={100} onChange={v => edit(n => { n.how.title = v })} />
        {c.how.steps.map((st, i) => (
          <div key={i} className="border border-surface-200 rounded-xl p-3 space-y-2">
            <Field label={`Step ${i + 1} title`} value={st.title} max={50} onChange={v => edit(n => { n.how.steps[i].title = v })} />
            <Field label="Text" area value={st.text} max={200} onChange={v => edit(n => { n.how.steps[i].text = v })} />
            <ItemBar i={i} n={c.how.steps.length} move={d => edit(n => swap(n.how.steps, i, d))} remove={() => edit(n => { n.how.steps.splice(i, 1) })} />
          </div>
        ))}
        {c.how.steps.length < 4 && (
          <button type="button" className="btn-outline !py-2 text-sm inline-flex items-center gap-1.5" onClick={() => edit(n => { n.how.steps.push({ title: 'New step', text: '' }) })}><Plus size={14} /> Add step</button>
        )}
      </Card>

      <Card title="Pricing" show={c.pricing.show} onShow={v => edit(n => { n.pricing.show = v })}>
        <Field label="Title" value={c.pricing.title} max={80} onChange={v => edit(n => { n.pricing.title = v })} />
        <Field label="Sub-title" value={c.pricing.subtitle} max={160} onChange={v => edit(n => { n.pricing.subtitle = v })} />
        {c.pricing.plans.map((p, i) => (
          <div key={i} className="border border-surface-200 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Plan name" value={p.name} max={30} onChange={v => edit(n => { n.pricing.plans[i].name = v })} />
              <Field label="Price text" value={p.price} max={30} onChange={v => edit(n => { n.pricing.plans[i].price = v })} />
              <Field label="Small tag (optional)" value={p.tag} max={30} onChange={v => edit(n => { n.pricing.plans[i].tag = v })} />
              <Field label="Button text" value={p.cta} max={30} onChange={v => edit(n => { n.pricing.plans[i].cta = v })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-secondary"><input type="checkbox" checked={p.highlight} onChange={e => edit(n => { n.pricing.plans[i].highlight = e.target.checked })} /> Highlight this plan</label>
            <div>
              <label className="label">What&apos;s included (one per line)</label>
              <textarea className="input" rows={5} value={p.features.join('\n')} onChange={e => edit(n => { n.pricing.plans[i].features = e.target.value.split('\n').map(x => x.slice(0, 90)).slice(0, 12) })} />
            </div>
            <ItemBar i={i} n={c.pricing.plans.length} move={d => edit(n => swap(n.pricing.plans, i, d))} remove={() => edit(n => { n.pricing.plans.splice(i, 1) })} />
          </div>
        ))}
        {c.pricing.plans.length < 4 && (
          <button type="button" className="btn-outline !py-2 text-sm inline-flex items-center gap-1.5" onClick={() => edit(n => { n.pricing.plans.push({ name: 'New plan', price: '৳0', tag: '', cta: 'Start free', highlight: false, features: [] }) })}><Plus size={14} /> Add plan</button>
        )}
      </Card>

      <Card title="Questions" show={c.faq.show} onShow={v => edit(n => { n.faq.show = v })}>
        <Field label="Title" value={c.faq.title} max={80} onChange={v => edit(n => { n.faq.title = v })} />
        {c.faq.items.map((f, i) => (
          <div key={i} className="border border-surface-200 rounded-xl p-3 space-y-2">
            <Field label="Question" value={f.q} max={140} onChange={v => edit(n => { n.faq.items[i].q = v })} />
            <Field label="Answer" area value={f.a} max={500} onChange={v => edit(n => { n.faq.items[i].a = v })} />
            <ItemBar i={i} n={c.faq.items.length} move={d => edit(n => swap(n.faq.items, i, d))} remove={() => edit(n => { n.faq.items.splice(i, 1) })} />
          </div>
        ))}
        {c.faq.items.length < 12 && (
          <button type="button" className="btn-outline !py-2 text-sm inline-flex items-center gap-1.5" onClick={() => edit(n => { n.faq.items.push({ q: 'New question', a: '' }) })}><Plus size={14} /> Add question</button>
        )}
      </Card>

      <Card title="Bottom call to action">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title (visitors)" value={c.cta.title} max={90} onChange={v => edit(n => { n.cta.title = v })} />
          <Field label="Text (visitors)" value={c.cta.text} max={160} onChange={v => edit(n => { n.cta.text = v })} />
          <Field label="Title (logged-in sellers)" value={c.cta.storeTitle} max={90} onChange={v => edit(n => { n.cta.storeTitle = v })} />
          <Field label="Text (logged-in sellers)" value={c.cta.storeText} max={160} onChange={v => edit(n => { n.cta.storeText = v })} />
        </div>
      </Card>

      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-surface-200 p-3">
        <div className="max-w-5xl mx-auto flex gap-2 justify-end">
          <button onClick={reset} className="px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50">Reset to original</button>
          <button onClick={save} disabled={busy} className="btn-primary !px-8 !py-2.5 disabled:opacity-60">{busy ? 'Saving…' : 'Save & publish'}</button>
        </div>
      </div>
    </div>
  )
}
