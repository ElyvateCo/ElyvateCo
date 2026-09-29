'use client'
import { useEffect, useState } from 'react'
import { Send, Trash2, Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Notification } from '@/lib/supabase'

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/notifications')
    const data = await res.json()
    setNotifications(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSend() {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return }
    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, link: link || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      toast.success('Sent! Visitors will see it live.')
      setTitle(''); setMessage(''); setLink('')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notification? It will disappear from anyone who hasn\'t seen it yet.')) return
    const res = await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() }
    else toast.error('Failed to delete')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-ink-muted mt-1">
          Send a message to everyone browsing your store right now — it shows up live in their notification bell.
        </p>
      </div>

      <div className="card p-6 mb-8">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Compose Broadcast</p>
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. Flash Sale!" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input resize-none min-h-[80px]" placeholder="e.g. 20% off everything today only — use code FLASH20" value={message} onChange={e => setMessage(e.target.value)} maxLength={500} />
          </div>
          <div>
            <label className="label">Link (optional)</label>
            <input className="input" placeholder="/products" value={link} onChange={e => setLink(e.target.value)} />
          </div>
          <button onClick={handleSend} disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
            {sending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
            Send to Everyone
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Recent Broadcasts</p>
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="card p-10 text-center">
          <Megaphone size={22} className="mx-auto text-ink-muted mb-2" />
          <p className="text-sm text-ink-muted">No broadcasts sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} className="card p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-ink-primary">{n.title}</p>
                <p className="text-xs text-ink-secondary mt-0.5">{n.message}</p>
                <p className="text-[11px] text-ink-muted mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => handleDelete(n.id)} className="p-2 rounded-xl hover:bg-red-50 text-ink-muted hover:text-red-500 transition-colors shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
