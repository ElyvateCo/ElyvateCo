'use client'
import { useState, useEffect, useCallback } from 'react'
import { safeSetItem } from './safeStorage'

const STORAGE_KEY = 'elyvate-dark-mode'

// Applies (or removes) the .dark class on <html>, which every component
// picks up automatically via the CSS variables in globals.css — no
// per-component dark: variants needed for the vast majority of the site.
function applyDarkClass(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

/**
 * Site-wide dark mode toggle. Persists the choice to localStorage so it's
 * remembered on the visitor's next visit. Safe to use from multiple
 * components at once (e.g. a toggle on the homepage AND one on the account
 * page) — they all read/write the same stored value and stay in sync via
 * the 'storage' event plus a same-tab custom event (the native 'storage'
 * event only fires in OTHER tabs, not the tab that made the change).
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))

    function sync() {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    window.addEventListener('storage', sync)
    window.addEventListener('elyvate-theme-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('elyvate-theme-change', sync)
    }
  }, [])

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark')
    applyDarkClass(next)
    safeSetItem(STORAGE_KEY, next ? 'dark' : 'light')
    setIsDark(next)
    window.dispatchEvent(new Event('elyvate-theme-change'))
  }, [])

  // `mounted` lets callers avoid rendering a toggle whose state might not
  // match the server-rendered HTML yet (dark mode is inherently a
  // client-only preference — see the inline script in app/layout.tsx that
  // applies it before hydration to avoid a flash of the wrong theme).
  return { isDark, toggle, mounted }
}

// The literal script injected into <head> — runs before React hydrates, so
// the correct theme applies on the very first paint instead of flashing
// light-then-dark (or vice versa) as soon as JS loads.
export const DARK_MODE_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    if (stored === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`
