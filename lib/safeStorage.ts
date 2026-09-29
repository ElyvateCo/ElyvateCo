// Wraps localStorage access so it can NEVER throw an uncaught exception.
//
// Some browsers — most notably in-app browsers like Instagram's, Facebook's,
// and TikTok's on iOS, and some private-browsing modes — restrict storage
// access and throw a SecurityError the moment you touch localStorage,
// rather than just failing quietly. An unguarded call crashes the entire
// React app with "Application error: a client-side exception has occurred."
//
// Every feature that uses localStorage (dark mode, notifications, order
// tracking) should go through these instead of calling localStorage
// directly, so a storage-restricted visitor just loses that one feature
// (dark mode won't persist, notifications won't dedupe) instead of the
// whole site crashing for them.

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
