'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ExternalLink, LogOut } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import AdminLightModeGuard from './AdminLightModeGuard'
import { supabaseMerchantBrowser } from '@/lib/supabase-merchant'

// Same cookie middleware.ts uses for the ?store= preview
const PREVIEW_COOKIE = 'elyvate_preview_store'

type Props = {
  storeName: string
  subdomain: string
  storeUrl: string      // where "View Store" goes
  storeLabel: string    // short address shown under the store name
  children: React.ReactNode
}

export default function AdminShell({ storeName, subdomain, storeUrl, storeLabel, children }: Props) {
  const router = useRouter()
  const path = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Close the phone menu after tapping a link
  useEffect(() => { setMenuOpen(false) }, [path])

  // Until a real domain is connected, the shared Vercel address can't show
  // different stores by hostname. While you're in the admin, remember YOUR
  // store so the main website on this browser shows the store you're editing
  // (instead of the default store, which is why new products seemed missing).
  useEffect(() => {
    if (storeUrl.startsWith('/?store=')) {
      document.cookie = `${PREVIEW_COOKIE}=${encodeURIComponent(subdomain)}; path=/; max-age=86400; samesite=lax`
    }
  }, [storeUrl, subdomain])

  async function handleLogout() {
    setLoggingOut(true)
    try { await supabaseMerchantBrowser().auth.signOut() } catch {}
    document.cookie = `${PREVIEW_COOKIE}=; path=/; max-age=0`
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-50 lg:flex">
      <AdminLightModeGuard />

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-0 h-screen"><AdminSidebar /></div>
      </div>

      {/* Phone menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 max-w-[80%] shadow-xl">
            <AdminSidebar onNavigate={() => setMenuOpen(false)} />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 p-2 rounded-xl text-ink-muted hover:bg-surface-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar: always visible — store name, View Store, Log out */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-surface-200 px-3 sm:px-6 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-1 rounded-xl text-ink-secondary hover:bg-surface-100"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-primary truncate">{storeName}</p>
            <p className="text-[11px] text-ink-muted truncate">{storeLabel}</p>
          </div>

          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:bg-surface-100 transition-colors"
          >
            <ExternalLink size={15} />
            <span className="hidden sm:inline">View store</span>
          </a>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60"
          >
            <LogOut size={15} />
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-10 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
