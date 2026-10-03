'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Image as ImageIcon, Settings, Tag, Star, Mail, FolderTree, Bell, AlertTriangle, Truck, CreditCard } from 'lucide-react'
import { useAdminPath } from './AdminPathContext'

// Paths are relative to the admin address (which each merchant can rename)
const nav = [
  { rel: '',               icon: LayoutDashboard, label: 'Dashboard'   },
  { rel: '/products',      icon: Package,         label: 'Products'    },
  { rel: '/categories',    icon: FolderTree,      label: 'Categories'  },
  { rel: '/orders',        icon: ShoppingBag,     label: 'Orders'      },
  { rel: '/delivery',      icon: Truck,           label: 'Delivery'    },
  { rel: '/payments',      icon: CreditCard,      label: 'Online Payments' },
  { rel: '/coupons',       icon: Tag,             label: 'Coupons'     },
  { rel: '/reviews',       icon: Star,            label: 'Reviews'     },
  { rel: '/contact',       icon: Mail,            label: 'Messages'    },
  { rel: '/notifications', icon: Bell,            label: 'Notifications' },
  { rel: '/errors',        icon: AlertTriangle,   label: 'Error Log'   },
  { rel: '/hero',          icon: ImageIcon,       label: 'Hero'        },
  { rel: '/settings',      icon: Settings,        label: 'Settings'    },
]

export default function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname()
  const adminPath = useAdminPath()
  const [newMessages, setNewMessages] = useState(0)

  useEffect(() => {
    fetch('/api/admin/contact')
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setNewMessages(data.filter(m => m.status === 'new').length) })
      .catch(() => {})
  }, [path])

  return (
    <aside className="h-full w-full bg-white border-r border-surface-200 flex flex-col">
      <div className="p-6 border-b border-surface-200">
        <p className="font-display text-xl font-semibold text-ink-primary">Elyvate</p>
        <p className="text-xs text-ink-muted mt-0.5">Admin Panel</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {nav.map(({ rel, icon: Icon, label }) => {
          const href = `/${adminPath}${rel}`
          const active = path === href || (rel !== '' && path.startsWith(href))
          return (
            <Link key={href} href={href} onClick={onNavigate} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-brand-50 text-brand-700' : 'text-ink-secondary hover:bg-surface-100 hover:text-ink-primary'}`}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {label === 'Messages' && newMessages > 0 && (
                <span className="px-1.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-700">{newMessages}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
