'use client'
import { useEffect, useState } from 'react'
import { Film, Check } from 'lucide-react'

type Template = { id: string; title: string; video_url: string; thumbnail_url: string | null }

// Ready-made background videos. Tapping one just fills in the video link —
// the merchant still presses Save like normal.
export default function VideoTemplatePicker({ current, onPick }: { current?: string | null; onPick: (url: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    fetch('/api/admin/video-templates')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setTemplates(d) })
      .catch(() => {})
  }, [])

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
      <p className="text-xs text-ink-muted mt-2">Tap a video, then press Save at the bottom.</p>
    </div>
  )
}
