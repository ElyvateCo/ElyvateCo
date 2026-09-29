'use client'
import { useEffect, useState } from 'react'
import { Mail, CheckCircle, Reply, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { ContactMessage } from '@/lib/supabase'

export default function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'new' | 'read' | 'replied'>('all')

  async function load() {
    setLoading(true)
    const res  = await fetch('/api/admin/contact')
    const data = await res.json()
    setMessages(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: ContactMessage['status']) {
    // Optimistic update so the UI feels instant
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    const res = await fetch('/api/admin/contact', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) { toast.error('Failed to update'); load(); return }
    toast.success(status === 'replied' ? 'Marked as replied' : 'Marked as read')
  }

  const filtered = messages.filter(m => filter === 'all' ? true : m.status === filter)
  const newCount = messages.filter(m => m.status === 'new').length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Contact Messages</h1>
          {newCount > 0 && <p className="text-sm text-amber-600 font-medium mt-1">{newCount} new message{newCount === 1 ? '' : 's'}</p>}
        </div>
        <div className="flex gap-2">
          {(['all', 'new', 'read', 'replied'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-white text-ink-secondary hover:bg-surface-100 shadow-card'}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center">
          <Mail className="mx-auto mb-3 text-ink-muted" size={28} />
          <p className="text-ink-muted text-sm">No messages here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink-primary">{m.name}</span>
                    <a href={`mailto:${m.email}`} className="text-xs text-brand-600 hover:underline">{m.email}</a>
                    {m.order_id && (
                      <span className="px-2 py-0.5 rounded-xl text-xs font-mono bg-surface-100 text-ink-secondary">#{m.order_id.toUpperCase()}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-xl text-xs font-medium capitalize ${
                      m.status === 'new'     ? 'bg-amber-100 text-amber-700' :
                      m.status === 'replied' ? 'bg-green-100 text-green-700' :
                                                'bg-surface-100 text-ink-secondary'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary whitespace-pre-wrap">{m.message}</p>
                  <p className="text-xs text-ink-muted mt-2">{new Date(m.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.status !== 'read' && m.status !== 'replied' && (
                    <button onClick={() => updateStatus(m.id, 'read')} className="p-2 rounded-xl hover:bg-surface-100 text-ink-muted hover:text-ink-primary transition-colors" title="Mark as read"><CheckCircle size={16} /></button>
                  )}
                  {m.status !== 'replied' && (
                    <button onClick={() => updateStatus(m.id, 'replied')} className="p-2 rounded-xl hover:bg-green-50 text-ink-muted hover:text-green-600 transition-colors" title="Mark as replied"><Reply size={16} /></button>
                  )}
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent('Re: Your Elyvate enquiry')}`}
                    onClick={() => { if (m.status === 'new') updateStatus(m.id, 'read') }}
                    className="p-2 rounded-xl hover:bg-brand-50 text-ink-muted hover:text-brand-600 transition-colors"
                    title="Reply via email"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
