'use client'
import Link from 'next/link'
import { Bell, Megaphone, Package, ChevronRight } from 'lucide-react'
import { useNotifications } from '@/lib/useNotifications'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function NotificationsPage() {
  const { notifications, loading } = useNotifications()

  return (
    <div className="section-pad pt-28 pb-20 min-h-screen bg-surface-50">
      <div className="container-xl max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Updates</p>
          <h1 className="font-display text-3xl font-semibold text-ink-primary">Notifications</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card p-16 text-center">
            <Bell size={28} className="mx-auto text-ink-muted mb-3" />
            <p className="text-ink-muted text-sm">Nothing here yet.</p>
            <p className="text-ink-muted text-xs mt-1">Order updates and announcements will show up here.</p>
          </div>
        ) : (
          <div className="card divide-y divide-surface-100 overflow-hidden">
            {notifications.map(n => {
              const Icon = n.type === 'broadcast' ? Megaphone : Package
              const content = (
                <div className="flex items-start gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${n.type === 'broadcast' ? 'bg-brand-50 text-brand-600' : 'bg-green-50 text-green-600'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-ink-primary">{n.title}</p>
                    <p className="text-sm text-ink-secondary mt-0.5">{n.message}</p>
                    <p className="text-xs text-ink-muted mt-1.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {n.link && <ChevronRight size={16} className="text-ink-muted shrink-0 mt-2" />}
                </div>
              )
              return n.link ? (
                <Link key={n.id} href={n.link}>{content}</Link>
              ) : (
                <div key={n.id}>{content}</div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
