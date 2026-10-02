'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Image as ImageIcon, Settings, ExternalLink, LogOut, Tag, Star, Mail, FolderTree, Bell, AlertTriangle } from 'lucide-react'
import { supabaseMerchantBrowser } from '@/lib/supabase-merchant'

const nav = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/admin/products',   icon: Package,         label: 'Products'    },
  { href: '/admin/categories', icon: FolderTree,      label: 'Categories'  },
  { href: '/admin/orders',     icon: ShoppingBag,     label: 'Orders'      },
  { href: '/admin/coupons',    icon: Tag,             label: 'Coupons'     },
  { href: '/admin/reviews',    icon: Star,            label: 'Reviews'     },
  { href: '/admin/contact',    icon: Mail,            label: 'Messages'    },
  { href: '/admin/notifications', icon: Bell,         label: 'Notifications' },
  { href: '/admin/errors',     icon: AlertTriangle,   label: 'Error Log'   },
  { href: '/admin/hero',       icon: ImageIcon,       label: 'Hero'        },
  { href: '/admin/settings',   icon: Settings,        label: 'Settings'    },
]

export default function AdminSidebar({ storeName, storeUrl }: { storeName?: string; storeUrl?: string }) {
  const path   = usePathname()
  const router = useRouter()
  const [newMessages, setNewMessages] = useState(0)

  useEffect(() => {
    fetch('/api/admin/contact')
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setNewMessages(data.filter(m => m.status === 'new').length) })
      .catch(() => {})
  }, [path])

  async function handleLogout() {
    await supabaseMerchantBrowser().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-surface-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-surface-200">
        <p className="font-display text-xl font-semibold text-ink-primary">Elyvate</p>
        <p className="text-xs text-ink-muted mt-0.5 truncate">{storeName ? `${storeName} · Admin` : 'Admin Panel'}</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== '/admin' && path.startsWith(href))
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-surface-100 hover:text-ink-primary'}`}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {label === 'Messages' && newMessages > 0 && (
                <span className="px-1.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-700">{newMessages}</span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-surface-200 space-y-0.5">
        <a href={storeUrl || '/'} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-secondary hover:bg-surface-100 transition-colors"><ExternalLink size={16} /> View Store</a>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-secondary hover:bg-red-50 hover:text-red-600 transition-colors"><LogOut size={16} /> Log Out</button>
      </div>
    </aside>
  )
}
