'use client'
import { useEffect, useState } from 'react'
import { Film, Check } from 'lucide-react'

type Template = { id: string; title: string; video_url: string; thumbnail_url: string | null }

// Ready-made background videos. Tapping one just fills in the video link —
// the merchant still presses Save like normal.
export default function VideoTemplatePicker({ current, onPick }: { current?: string | null; onPick: (url: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [locked, setLocked] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin/video-templates')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setTemplates(d); else if (d?.locked) setLocked(true) })
      .catch(() => {})
  }, [])

  if (locked) {
    return (
      <div className="mb-4 bg-brand-50 border border-brand-100 rounded-2xl p-4">
        <p className="text-sm font-semibold text-ink-primary flex items-center gap-2"><Film size={14} /> Ready-made videos</p>
        <p className="text-xs text-ink-secondary mt-1">Pick a ready-made background video with the Pro plan. Upgrade to unlock it.</p>
      </div>
    )
  }
  if (templates.length === 0) return null

  return (
    <div className="mb-4">
      <p className="label flex items-center gap-2"><Film size={14} /> Ready-made videos</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {templates.map(t => {
          const selected = current === t.video_url
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.video_url)}
              className={`relative rounded-2xl overflow-hidden border-2 text-left bg-surface-100 ${selected ? 'border-brand-600' : 'border-transparent hover:border-surface-300'}`}
            >
              <div className="aspect-video bg-black">
                {t.thumbnail_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={t.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : <video src={t.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />}
              </div>
              <p className="text-xs font-medium text-ink-primary px-2 py-1.5 truncate">{t.title}</p>
              {selected && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center"><Check size={14} /></span>
              )}
            </button>
          )
        })}
      </div>
      {(() => {
        const picked = templates.find(t => t.video_url === current)
        if (!picked) return <p className="text-xs text-ink-muted mt-2">Tap a video, then press Save at the bottom.</p>
        return (
          <div className="mt-3 bg-brand-50 border border-brand-100 rounded-2xl p-3">
            <p className="text-xs font-semibold text-ink-primary mb-1.5">Selected: {picked.title}</p>
            <div className="flex gap-2">
              <input readOnly value={picked.video_url} onFocus={e => e.currentTarget.select()} className="input !py-2 text-xs" aria-label="Video link" />
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(picked.video_url) } catch { /* the link is selected on tap — copy manually */ }
                  setCopied(true); setTimeout(() => setCopied(false), 1800)
                }}
                className="btn-outline !px-4 !py-2 text-xs shrink-0"
              >
                {copied ? 'Copied ✓' : 'Copy link'}
              </button>
            </div>
            <p className="text-[11px] text-ink-muted mt-1.5">Press Save at the bottom to use this video.</p>
          </div>
        )
      })()}
    </div>
  )
}
