'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { fetchJson } from '@/lib/fetchJson'

const NAV = [
  { href: '/rafiixr', label: 'Overview' },
  { href: '/rafiixr/stores', label: 'Stores' },
  { href: '/rafiixr/plans', label: 'Plans & features' },
  { href: '/rafiixr/landing', label: 'Landing page' },
  { href: '/rafiixr/videos', label: 'Videos' },
  { href: '/rafiixr/fraud', label: 'Fraud check' },
]

export default function PanelShell({ email, children }: { email: string; children: React.ReactNode }) {
  const path = usePathname()

  async function logout() {
    await fetchJson('/api/auth/logout', { method: 'POST' }, 10000)
    window.location.assign('/login')
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white border-b border-surface-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink-primary leading-tight">Elyvate · Main admin</p>
            <p className="text-[11px] text-ink-muted truncate">{email}</p>
          </div>
          <button onClick={logout} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100">
            <LogOut size={15} /> Log out
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV.map(n => {
            const active = n.href === '/rafiixr' ? path === n.href : path.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-secondary hover:text-ink-primary'}`}>
                {n.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  )
}
