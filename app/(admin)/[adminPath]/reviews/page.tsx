'use client'
import { useEffect, useState } from 'react'
import { Star, CheckCircle, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

type Review = { id: string; product_id: string; author_name: string; rating: number; body: string; is_approved: boolean; created_at: string }

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'pending' | 'approved'>('pending')

  async function load() {
    setLoading(true)
    const res  = await fetch('/api/admin/reviews')
    const data = await res.json()
    setReviews(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    await fetch('/api/admin/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_approved: true }) })
    toast.success('Review approved'); load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this review?')) return
    await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' })
    toast.success('Review deleted'); load()
  }

  const filtered = reviews.filter(r => filter === 'all' ? true : filter === 'pending' ? !r.is_approved : r.is_approved)
  const pending  = reviews.filter(r => !r.is_approved).length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reviews</h1>
          {pending > 0 && <p className="text-sm text-amber-600 font-medium mt-1">{pending} pending approval</p>}
        </div>
        <div className="flex gap-2">
          {(['pending', 'approved', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-white text-ink-secondary hover:bg-surface-100 shadow-card'}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center"><p className="text-ink-muted text-sm">No reviews here.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={13} className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-200 fill-surface-200'} />)}</div>
                    <span className="font-semibold text-sm text-ink-primary">{r.author_name}</span>
                    <span className={`px-2 py-0.5 rounded-xl text-xs font-medium ${r.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary">{r.body}</p>
                  <p className="text-xs text-ink-muted mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!r.is_approved && (
                    <button onClick={() => approve(r.id)} className="p-2 rounded-xl hover:bg-green-50 text-ink-muted hover:text-green-600 transition-colors" title="Approve"><CheckCircle size={16} /></button>
                  )}
                  <button onClick={() => remove(r.id)} className="p-2 rounded-xl hover:bg-red-50 text-ink-muted hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
