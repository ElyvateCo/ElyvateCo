'use client'
import { useEffect, useState } from 'react'
import { Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchJson } from '@/lib/fetchJson'

type Video = { id: string; title: string; video_url: string; thumbnail_url: string | null; sort_order: number; is_active: boolean }

function VideoCard({ v, i, n, onChange, onMove }: { v: Video; i: number; n: number; onChange: () => void; onMove: (d: -1 | 1) => void }) {
  const [title, setTitle] = useState(v.title)
  const [url, setUrl] = useState(v.video_url)
  const [thumb, setThumb] = useState(v.thumbnail_url ?? '')
  const dirty = title !== v.title || url !== v.video_url || thumb !== (v.thumbnail_url ?? '')

  async function save(patch: Record<string, unknown>, msg: string) {
    const r = await fetchJson('/api/rafiixr/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id, ...patch }) })
    if (!r.ok) { toast.error(String(r.data.error || 'Could not save')); return }
    toast.success(msg); onChange()
  }
  async function remove() {
    if (!confirm(`Delete "${v.title}"? Stores that use it keep their saved link.`)) return
    const r = await fetchJson(`/api/rafiixr/videos?id=${v.id}`, { method: 'DELETE' })
    if (!r.ok) { toast.error('Could not delete'); return }
    toast.success('Deleted'); onChange()
  }
  function copy() { navigator.clipboard?.writeText(v.video_url).then(() => toast.success('Link copied'), () => toast.error('Copy failed')) }

  return (
    <div className={`bg-white rounded-2xl shadow-card p-3 ${v.is_active ? '' : 'opacity-70'}`}>
      <div className="flex gap-3">
        <div className="w-28 shrink-0 aspect-video bg-black rounded-lg overflow-hidden">
          {thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumb} alt="" className="w-full h-full object-cover" />
            : <video src={v.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" controls />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input className="input !py-2 text-sm" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} aria-label="Title" />
          <input className="input !py-2 text-xs" value={url} onChange={e => setUrl(e.target.value)} aria-label="Video link" placeholder="Video link (https://…)" />
          <input className="input !py-2 text-xs" value={thumb} onChange={e => setThumb(e.target.value)} aria-label="Preview picture link" placeholder="Preview picture link (optional)" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          <input type="checkbox" checked={v.is_active} onChange={e => save({ is_active: e.target.checked }, e.target.checked ? 'Shown to merchants' : 'Hidden from merchants')} /> Shown to merchants
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={copy} className="p-2 rounded-lg hover:bg-surface-100" aria-label="Copy link"><Copy size={14} /></button>
          <button type="button" disabled={i === 0} onClick={() => onMove(-1)} className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
          <button type="button" disabled={i === n - 1} onClick={() => onMove(1)} className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
          <button type="button" onClick={remove} className="p-2 rounded-lg text-red-500 hover:bg-red-50" aria-label="Delete"><Trash2 size={14} /></button>
          {dirty && <button type="button" onClick={() => save({ title, video_url: url, thumbnail_url: thumb }, 'Saved')} className="btn-primary !px-4 !py-2 text-xs">Save</button>}
        </div>
      </div>
    </div>
  )
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [thumb, setThumb] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const r = await fetchJson('/api/rafiixr/videos')
    if (r.ok && Array.isArray(r.data)) { setVideos(r.data as unknown as Video[]); setErr('') } else setErr(String(r.data.error || 'Could not load'))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const r = await fetchJson('/api/rafiixr/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, video_url: url, thumbnail_url: thumb }) })
    setBusy(false)
    if (!r.ok) { toast.error(String(r.data.error || 'Could not add')); return }
    toast.success('Video added'); setTitle(''); setUrl(''); setThumb(''); load()
  }

  // swap order numbers with the neighbour
  async function move(i: number, d: -1 | 1) {
    const a = videos[i], b = videos[i + d]
    if (!a || !b) return
    const orderA = a.sort_order === b.sort_order ? i + d : b.sort_order
    const orderB = a.sort_order === b.sort_order ? i : a.sort_order
    await Promise.all([
      fetchJson('/api/rafiixr/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, sort_order: orderA }) }),
      fetchJson('/api/rafiixr/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, sort_order: orderB }) }),
    ])
    load()
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Ready-made videos</h1>
      <p className="text-sm text-ink-secondary mb-4">The background videos merchants can pick on Pro. Upload each video to Cloudflare, then paste its link here. Use short, silent videos (5–10 seconds, 2–4 MB).</p>

      <form onSubmit={add} className="bg-white rounded-2xl shadow-card p-4 mb-5 space-y-2">
        <p className="text-sm font-semibold">Add a video</p>
        <input required className="input" placeholder="Title merchants will see, e.g. Soft waves" maxLength={60} value={title} onChange={e => setTitle(e.target.value)} />
        <input required className="input" placeholder="Video link (https://… .mp4)" value={url} onChange={e => setUrl(e.target.value)} />
        <input className="input" placeholder="Preview picture link (optional)" value={thumb} onChange={e => setThumb(e.target.value)} />
        <button type="submit" disabled={busy} className="btn-primary !px-6 !py-2.5 text-sm disabled:opacity-60">{busy ? 'Adding…' : 'Add video'}</button>
      </form>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
      {loading ? (
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="space-y-3">
          {videos.length === 0 && !err && <p className="text-sm text-ink-secondary">No videos yet. Add your first one above.</p>}
          {videos.map((v, i) => (
            <VideoCard key={`${v.id}-${v.title}-${v.video_url}-${v.thumbnail_url}-${v.is_active}-${v.sort_order}`} v={v} i={i} n={videos.length} onChange={load} onMove={d => move(i, d)} />
          ))}
        </div>
      )}
    </div>
  )
}
