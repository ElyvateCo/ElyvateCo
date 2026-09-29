'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package, Heart, LogOut, Mail, Calendar,
  Truck, MessageCircle, FileText, RotateCcw, ShieldCheck, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import { useWishlist } from '@/lib/wishlistStore'
import { supabaseBrowser } from '@/lib/supabase'
import { useStoreId } from '@/lib/storeContext'
import DarkModeToggle from '@/components/store/DarkModeToggle'
import toast from 'react-hot-toast'

const supportLinks = [
  { href: '/track-order',     icon: Truck,         label: 'Track an Order' },
  { href: '/contact',         icon: MessageCircle, label: 'Contact Us' },
  { href: '/shipping-policy', icon: FileText,      label: 'Shipping Policy' },
  { href: '/returns-policy',  icon: RotateCcw,      label: 'Returns & Refunds' },
  { href: '/privacy-policy',  icon: ShieldCheck,    label: 'Privacy Policy' },
]

export default function AccountPage() {
  const storeId = useStoreId()
  const { user, loading, signOut } = useAuth()
  const { items: wishlistItems, loading: wishlistLoading } = useWishlist()
  const router = useRouter()

  const [orderCount, setOrderCount] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/account/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user?.email || !storeId) return
    const sb = supabaseBrowser()
    sb.from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('customer_email', user.email)
      .then(({ count }) => setOrderCount(count ?? 0))
  }, [user, storeId])

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const displayName  = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer'
  const avatarLetter = displayName[0].toUpperCase()
  const joinedDate   = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
    router.push('/')
  }

  return (
    <div className="section-pad pt-28 pb-24 bg-surface-50 min-h-screen">
      <div className="container-xl max-w-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">My Account</p>
            <h1 className="font-display text-3xl font-semibold text-ink-primary">Welcome back, {displayName.split(' ')[0]}</h1>
          </div>
          <DarkModeToggle className="bg-surface-100 hover:bg-surface-200 text-ink-primary shrink-0" />
        </div>

        {/* Profile card */}
        <div className="card p-6 sm:p-7 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-display font-semibold shrink-0 ring-4 ring-brand-50">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-ink-primary truncate">{displayName}</h2>
              <p className="text-sm text-ink-secondary flex items-center gap-1.5 mt-1.5 truncate">
                <Mail size={13} className="shrink-0" /> {user.email}
              </p>
              <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-1">
                <Calendar size={12} className="shrink-0" /> Member since {joinedDate}
              </p>
            </div>
          </div>
        </div>

        {/* Primary actions */}
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3 px-1">Your Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link href="/account/orders" className="card p-5 flex items-center gap-4 hover:border-brand-200 group">
            <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
              <Package size={20} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink-primary text-sm">Order History</p>
              <p className="text-xs text-ink-muted">
                {orderCount === null ? 'Loading…' : orderCount === 0 ? 'No orders yet' : `${orderCount} order${orderCount === 1 ? '' : 's'} placed`}
              </p>
            </div>
          </Link>
          <Link href="/wishlist" className="card p-5 flex items-center gap-4 hover:border-brand-200 group">
            <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
              <Heart size={20} className="text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink-primary text-sm">Wishlist</p>
              <p className="text-xs text-ink-muted">
                {wishlistLoading ? 'Loading…' : wishlistItems.length === 0 ? 'No saved items' : `${wishlistItems.length} item${wishlistItems.length === 1 ? '' : 's'} saved`}
              </p>
            </div>
          </Link>
        </div>

        {/* Help & Support */}
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3 px-1">Help & Support</p>
        <div className="card divide-y divide-surface-100 mb-8 overflow-hidden">
          {supportLinks.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors group">
              <div className="w-9 h-9 bg-surface-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-surface-200 transition-colors">
                <Icon size={16} className="text-ink-secondary" />
              </div>
              <span className="flex-1 text-sm font-medium text-ink-primary">{label}</span>
              <ChevronRight size={16} className="text-ink-muted group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="card w-full flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50/60 transition-colors"
        >
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
            <LogOut size={16} />
          </div>
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
