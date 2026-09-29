'use client'
import { useEffect } from 'react'

// The dark-mode class is applied globally on <html> (so it can affect the
// whole storefront from a single toggle) via localStorage, which is shared
// across every route on the domain — including this admin panel, which
// never got its own dark-mode toggle and whose components haven't been
// audited for it. Without this, an admin who'd switched the storefront to
// dark mode would see a half-broken dark admin panel. This just always
// forces it back to light here, regardless of the storefront preference.
export default function AdminLightModeGuard() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  return null
}
