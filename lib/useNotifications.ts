'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabaseBrowser } from './supabase'
import type { Notification } from './supabase'
import { getMyOrders } from './myOrders'
import { safeGetItem, safeSetItem } from './safeStorage'
import toast from 'react-hot-toast'
import { useStoreId } from './storeContext'

const LAST_SEEN_KEY = 'elyvate-notifications-last-seen'
const POPPED_KEY     = 'elyvate-notifications-popped'
const MAX_NOTIFICATIONS = 30

function getLastSeen(): number {
  return Number(safeGetItem(LAST_SEEN_KEY) ?? 0)
}

function getPopped(): Set<string> {
  try {
    const raw = safeGetItem(POPPED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markPopped(id: string) {
  const popped = getPopped()
  popped.add(id)
  // Keep this bounded — only the most recent 50 IDs matter for dedup purposes
  const trimmed = Array.from(popped).slice(-50)
  safeSetItem(POPPED_KEY, JSON.stringify(trimmed))
}

export function useNotifications() {
  const storeId = useStoreId()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const myOrdersRef = useRef<string[]>([])

  const recomputeUnread = useCallback((list: Notification[]) => {
    const lastSeen = getLastSeen()
    setUnreadCount(list.filter(n => new Date(n.created_at).getTime() > lastSeen).length)
  }, [])

  // Shows the live "pop-up" toast for a single new notification, but only
  // once ever per notification ID — without this, remounting this hook on
  // every page navigation would re-show the same popup repeatedly.
  const maybePopToast = useCallback((n: Notification) => {
    const popped = getPopped()
    if (popped.has(n.id)) return
    markPopped(n.id)
    toast.success(n.message, { duration: 5000, icon: '🔔' })
  }, [])

  useEffect(() => {
    if (!storeId) return
    myOrdersRef.current = getMyOrders()
    const sb = supabaseBrowser()
    let active = true

    async function loadInitial() {
      try {
        const myOrders = myOrdersRef.current
        // Broadcasts go to everyone; order updates only for orders this
        // browser actually placed (see lib/myOrders.ts for why).
        const orClause = myOrders.length > 0
          ? `type.eq.broadcast,order_id.in.(${myOrders.join(',')})`
          : `type.eq.broadcast`

        const { data } = await sb
          .from('notifications')
          .select('*')
          .eq('store_id', storeId)
          .or(orClause)
          .order('created_at', { ascending: false })
          .limit(MAX_NOTIFICATIONS)

        if (!active) return
        const list = data ?? []
        setNotifications(list)
        recomputeUnread(list)
      } catch {
        // If even the initial fetch fails, notifications just won't show —
        // never worth crashing the whole page over.
      } finally {
        if (active) setLoading(false)
      }
    }

    loadInitial()

    // Realtime subscription — this is what makes a notification appear
    // instantly while the customer is browsing, rather than only on their
    // next page load. Wrapped defensively: a WebSocket connection can fail
    // for reasons outside our control (restrictive networks, corporate
    // firewalls, browser extensions) — when it does, notifications simply
    // won't arrive live, which is a much better outcome than crashing the
    // entire site over a feature that isn't essential to using the store.
    let channel: ReturnType<typeof sb.channel> | null = null
    try {
      channel = sb
        .channel('notifications-feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `store_id=eq.${storeId}` },
          (payload) => {
            const n = payload.new as Notification
            if (n.store_id !== storeId) return
            const isRelevant = n.type === 'broadcast' || (n.order_id && myOrdersRef.current.includes(n.order_id))
            if (!isRelevant) return

            setNotifications(prev => [n, ...prev].slice(0, MAX_NOTIFICATIONS))
            setUnreadCount(prev => prev + 1)
            maybePopToast(n)
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Notifications: live updates unavailable, falling back to page-load only.', err)
          }
        })
    } catch (err) {
      console.warn('Notifications: could not start live updates.', err)
    }

    return () => {
      active = false
      if (channel) sb.removeChannel(channel)
    }
  }, [recomputeUnread, maybePopToast, storeId])

  const markAllRead = useCallback(() => {
    safeSetItem(LAST_SEEN_KEY, String(Date.now()))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, loading, markAllRead }
}
