'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCart } from '@/lib/cartStore'
import { useWishlist } from '@/lib/wishlistStore'
import { useAuth } from '@/lib/authContext'

const tabs = [
  {
    href: '/',
    label: 'Home',
    active: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    ),
    inactive: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L12 3l9 9"/>
        <path d="M3 12v9h5v-6h6v6h5v-9"/>
      </svg>
    ),
  },
  {
    href: '/products',
    label: 'Products',
    active: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="3" width="5" height="5" rx="1"/>
        <rect x="9.5" y="3" width="5" height="5" rx="1"/>
        <rect x="17" y="3" width="5" height="5" rx="1"/>
        <rect x="2" y="10.5" width="5" height="5" rx="1"/>
        <rect x="9.5" y="10.5" width="5" height="5" rx="1"/>
        <rect x="17" y="10.5" width="5" height="5" rx="1"/>
      </svg>
    ),
    inactive: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/wishlist',
    label: 'Favorites',
    isWishlist: true,
    active: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
    inactive: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
  },
  {
    href: '/cart',
    label: 'Cart',
    isCart: true,
    active: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.44C4.74 14.72 5.48 16 6.62 16H19v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 12h8.45c.75 0 1.41-.41 1.75-1.03L21.7 5H6.21L5.27 2H1z"/>
      </svg>
    ),
    inactive: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        <circle cx="10" cy="20.5" r="1.5"/>
        <circle cx="18" cy="20.5" r="1.5"/>
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'Account',
    isAccount: true,
    active: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    ),
    inactive: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname   = usePathname()
  const router     = useRouter()
  const { items }  = useCart()
  const { items: wishlistItems } = useWishlist()
  const { user }   = useAuth()
  const cartCount  = items.reduce((a, b) => a + b.quantity, 0)
  const wishlistCount = wishlistItems.length

  // Track which tab was JUST tapped — for instant icon swap before route settles
  const [tapped, setTapped] = useState<string | null>(null)
  // Track which tab just became active — for triggering the bounce animation
  const [animating, setAnimating] = useState<string | null>(null)

  // When real pathname changes, clear the tapped state
  useEffect(() => { setTapped(null) }, [pathname])

  function getActiveHref(tab: typeof tabs[number]) {
    if (tab.isAccount) return user ? '/account' : '/account/login'
    return tab.href
  }

  function isActive(tab: typeof tabs[number]) {
    const current = tapped ?? (tab.href === '/' ? (pathname === '/' ? '/' : null) : pathname.startsWith(tab.href) ? tab.href : null)
    if (tapped) return tapped === tab.href
    if (tab.href === '/') return pathname === '/'
    return pathname.startsWith(tab.href)
  }

  function handleTap(tab: typeof tabs[number]) {
    const href = getActiveHref(tab)
    const alreadyActive = isActive(tab)
    if (!alreadyActive) {
      setTapped(tab.href)
      setAnimating(tab.href)
      // Clear animation key after it plays so it can re-trigger next time
      setTimeout(() => setAnimating(null), 450)
    }
    router.push(href)
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-surface-0/92 backdrop-blur-xl border-t border-black/[0.06] shadow-[0_-4px_24px_rgba(0,0,0,0.07)]">
          <div className="flex items-center justify-around h-[62px] px-1">
            {tabs.map((tab) => {
              const active = isActive(tab)
              const isAnimating = animating === tab.href

              return (
                <button
                  key={tab.href}
                  onClick={() => handleTap(tab)}
                  className="relative flex flex-col items-center justify-center gap-[3px] flex-1 h-full select-none outline-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {/* Icon container */}
                  <div className="relative flex items-center justify-center">

                    {/* Active glow pill */}
                    <span
                      className="absolute rounded-2xl transition-all duration-300 ease-out"
                      style={{
                        inset: '-5px -14px',
                        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                        transform: active ? 'scale(1)' : 'scale(0.7)',
                        opacity: active ? 1 : 0,
                      }}
                    />

                    {/* Icon — instantly switches, then bounces */}
                    <span
                      key={`${tab.href}-${active}`} // re-mount to retrigger animation
                      className={`relative ${active ? 'text-brand-600' : 'text-ink-muted'} ${isAnimating ? 'nav-icon-active' : active ? 'nav-icon-idle' : ''}`}
                      style={active && !isAnimating ? { transform: 'translateY(-2px) scale(1.1)' } : undefined}
                    >
                      {active ? tab.active : tab.inactive}
                    </span>

                    {/* Cart badge */}
                    {tab.isCart && cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none z-10">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}

                    {/* Wishlist badge */}
                    {tab.isWishlist && wishlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none z-10">
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                      </span>
                    )}

                    {/* Online dot for logged-in account */}
                    {tab.isAccount && user && !active && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10px] tracking-wide transition-colors duration-200 ${
                      active ? 'text-brand-600 font-semibold nav-label-active' : 'text-ink-muted font-medium'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Spacer so page content clears the nav bar */}
      <div className="md:hidden h-[calc(62px+env(safe-area-inset-bottom,0px))]" />
    </>
  )
}
