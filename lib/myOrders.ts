// Since most checkouts are guests with no account, there's no login session
// to attach notifications to. Instead, each browser quietly remembers the
// order IDs it has placed — that's enough to show "your order is
// processing" to the right person without requiring an account, while
// staying entirely local (never sent anywhere except back to Supabase to
// ask "any updates for these IDs?").

import { safeGetItem, safeSetItem } from './safeStorage'

const STORAGE_KEY = 'elyvate-my-orders'
const MAX_REMEMBERED = 20 // keep it bounded — no need to remember forever

export function rememberOrder(orderId: string) {
  const existing = getMyOrders()
  if (existing.includes(orderId)) return
  const updated = [orderId, ...existing].slice(0, MAX_REMEMBERED)
  safeSetItem(STORAGE_KEY, JSON.stringify(updated))
}

export function getMyOrders(): string[] {
  try {
    const raw = safeGetItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
