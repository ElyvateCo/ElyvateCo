'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2, ChevronDown, ChevronUp, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ErrorLog } from '@/lib/supabase'

// Turns a raw user-agent string into something readable at a glance, e.g.
// "Safari on iPhone (Instagram in-app browser)".
function describeUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device'
  const isInstagram = /Instagram/i.test(ua)
  const isFacebook  = /FBAN|FBAV/i.test(ua)
  const isTikTok    = /TikTok/i.test(ua)
  const device = /iPhone/i.test(ua) ? 'iPhone' : /iPad/i.test(ua) ? 'iPad' : /Android/i.test(ua) ? 'Android' : 'Desktop'
  const browser = isInstagram ? 'Instagram in-app browser' : isFacebook ? 'Facebook in-app browser' : isTikTok ? 'TikTok in-app browser' : /CriOS/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : 'Browser'
  return `${browser} on ${device}`
}

export default function AdminErrors() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/errors')
    const data = await res.json()
    setErrors(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/errors?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() }
  }

  async function handleClearAll() {
    if (!confirm('Delete all logged errors?')) return
    const res = await fetch('/api/admin/errors?all=true', { method: 'DELETE' })
    if (res.ok) { toast.success('Cleared'); load() }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Error Log</h1>
          <p className="text-sm text-ink-muted mt-1">Real crashes reported automatically from visitors' browsers</p>
        </div>
        {errors.length > 0 && (
          <button onClick={handleClearAll} className="btn-secondary text-sm">Clear All</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : errors.length === 0 ? (
        <div className="card p-16 text-center">
          <AlertTriangle size={28} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted text-sm">No errors reported. That's a good sign!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map(e => {
            const isOpen = expanded === e.id
            return (
              <div key={e.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-50 transition-colors"
                >
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-ink-primary break-words">{e.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-ink-muted">
                        <Smartphone size={11} /> {describeUserAgent(e.user_agent)}
                      </span>
                      <span className="text-xs text-ink-muted">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-ink-muted shrink-0" /> : <ChevronDown size={16} className="text-ink-muted shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-surface-100 pt-3">
                    {e.url && (
                      <div>
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Page</p>
                        <p className="text-xs text-ink-secondary break-all">{e.url}</p>
                      </div>
                    )}
                    {e.stack && (
                      <div>
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Stack Trace</p>
                        <pre className="text-[11px] text-ink-secondary bg-surface-50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-words">{e.stack}</pre>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Full User Agent</p>
                      <p className="text-[11px] text-ink-muted break-all">{e.user_agent}</p>
                    </div>
                    <button onClick={() => handleDelete(e.id)} className="flex items-center gap-1.5 text-xs text-red-500 hover:underline">
                      <Trash2 size={12} /> Delete this entry
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
