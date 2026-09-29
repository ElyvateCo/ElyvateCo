'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingCart, Search, User, LogOut, Package, ChevronDown, Menu, X } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useCart } from '@/lib/cartStore'
import { useAuth } from '@/lib/authContext'

// Pages where navbar is always solid (no transparent hero)
const SOLID_PAGES = ['/products', '/search', '/wishlist', '/cart', '/checkout', '/account', '/track-order', '/contact', '/shipping-policy', '/returns-policy', '/privacy-policy']

export default function Navbar() {
  const [scrolled, setScrolled]        = useState(false)
  const [menuOpen, setMenuOpen]        = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { items } = useCart()
  const { user, loading, signOut } = useAuth()
  const router      = useRouter()
  const pathname    = usePathname()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const count       = items.reduce((a, b) => a + b.quantity, 0)

  // Force solid on pages that don't have a hero background
  const alwaysSolid = SOLID_PAGES.some(p => pathname.startsWith(p))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const light = scrolled || menuOpen || alwaysSolid

  async function handleSignOut() {
    setUserMenuOpen(false)
    await signOut()
    router.push('/')
    router.refresh()
  }

  const displayName  = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account'
  const avatarLetter = (user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      light ? 'bg-surface-0/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <nav className="container-xl section-pad h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className={`font-display text-2xl font-semibold tracking-tight transition-colors ${
            light ? 'text-ink-primary' : 'text-white'
          }`}
        >
          Elyvate
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className={`text-sm transition-colors ${light ? 'text-ink-secondary hover:text-ink-primary' : 'text-white/80 hover:text-white'}`}>
            Home
          </Link>
          <Link href="/products" className={`text-sm transition-colors ${light ? 'text-ink-secondary hover:text-ink-primary' : 'text-white/80 hover:text-white'}`}>
            Products
          </Link>
          <Link href="/wishlist" className={`text-sm transition-colors ${light ? 'text-ink-secondary hover:text-ink-primary' : 'text-white/80 hover:text-white'}`}>
            Favorites
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          <NotificationBell light={light} />

          {/* Search — now lives in the top bar on all screen sizes since mobile bottom nav uses that slot for Favorites */}
          <Link
            href="/search"
            className={`p-2 rounded-xl transition-colors ${
              light ? 'hover:bg-surface-100 text-ink-primary' : 'hover:bg-white/10 text-white'
            }`}
          >
            <Search size={20} />
          </Link>

          {/* Cart — visible on all screen sizes in top bar */}
          <Link
            href="/cart"
            className={`relative p-2 rounded-xl transition-colors ${
              light ? 'hover:bg-surface-100 text-ink-primary' : 'hover:bg-white/10 text-white'
            }`}
          >
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-medium">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>

          {/* User menu — desktop only */}
          {!loading && (
            <div className="hidden md:block relative" ref={userMenuRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${
                      light ? 'hover:bg-surface-100' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {avatarLetter}
                    </div>
                    <span className={`text-sm font-medium ${light ? 'text-ink-primary' : 'text-white'}`}>
                      {displayName}
                    </span>
                    <ChevronDown size={14} className={`${light ? 'text-ink-muted' : 'text-white/70'} ${userMenuOpen ? 'rotate-180' : ''} transition-transform`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-surface-0 rounded-2xl shadow-hover border border-surface-200 overflow-hidden py-1">
                      <div className="px-4 py-2.5 border-b border-surface-100">
                        <p className="text-xs font-semibold text-ink-primary truncate">{user.email}</p>
                      </div>
                      <Link href="/account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-secondary hover:bg-surface-50 hover:text-ink-primary transition-colors">
                        <User size={15} /> My Account
                      </Link>
                      <Link href="/account/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-secondary hover:bg-surface-50 hover:text-ink-primary transition-colors">
                        <Package size={15} /> Order History
                      </Link>
                      <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link href="/account/login" className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  light ? 'text-ink-primary hover:bg-surface-100' : 'text-white/90 hover:bg-white/10'
                }`}>
                  <User size={16} /> Sign In
                </Link>
              )}
            </div>
          )}

          {/* Hamburger — desktop only (mobile uses bottom nav) */}
          <button
            className={`hidden md:flex p-2 rounded-xl transition-colors ${
              light ? 'hover:bg-surface-100 text-ink-primary' : 'hover:bg-white/10 text-white'
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'none' }} // desktop hamburger not needed since we have nav links
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
    </header>
  )
}
