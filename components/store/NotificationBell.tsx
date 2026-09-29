'use client'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/lib/useNotifications'

export default function NotificationBell({ light }: { light: boolean }) {
  const { unreadCount, markAllRead } = useNotifications()

  return (
    <Link
      href="/notifications"
      onClick={markAllRead}
      aria-label="Notifications"
      className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
        light ? 'text-ink-primary hover:bg-surface-100' : 'text-white hover:bg-white/10'
      }`}
    >
      <Bell size={19} />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
