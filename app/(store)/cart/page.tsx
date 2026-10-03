'use client'
import { formatPrice } from '@/lib/money'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cartStore'
import { useAuth } from '@/lib/authContext'
import AuthModal from '@/components/store/AuthModal'

export const dynamic = 'force-dynamic'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)

  function fireCheckoutIntentEmail() {
    // Fire-and-forget — never await this or block navigation on it.
    // This is just a "heads up" notification, not critical to the purchase flow.
    fetch('/api/checkout/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
        total: total(),
        customerEmail: user?.email ?? null,
      }),
    }).catch(() => { /* silently ignore — never disrupt the customer */ })
  }

  function handleCheckoutClick() {
    // If auth is still loading, wait
    if (loading) return
    // Notify admin immediately that someone is checking out — before any form is filled
    fireCheckoutIntentEmail()
    // If already logged in, go straight to checkout
    if (user) { router.push('/checkout'); return }
    // Otherwise show the popup
    setShowAuthModal(true)
  }

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 section-pad pt-28 pb-20">
      <ShoppingBag size={48} className="text-surface-300" />
      <h2 className="font-display text-2xl text-ink-primary">Your cart is empty</h2>
      <p className="text-ink-secondary text-sm">Add some products to get started.</p>
      <Link href="/products" className="btn-primary">Browse Products</Link>
    </div>
  )

  return (
    <>
      <div className="section-pad pt-28 pb-20">
        <div className="container-xl">
          <h1 className="font-display text-3xl font-semibold mb-10">Your Cart</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 min-w-0">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4 min-w-0 w-full">
              {items.map(item => (
                <div key={item.id} className="card p-4 min-w-0 w-full">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-surface-100 shrink-0">
                      {item.image && <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <Link href={`/products/${item.slug}`} className="font-semibold text-sm text-ink-primary hover:text-brand-600 break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                        {item.name}
                      </Link>
                      <p className="text-brand-600 font-bold mt-1">{formatPrice(item.price)}</p>
                    </div>
                    {/* Qty + delete sit inline on desktop only */}
                    <div className="hidden sm:flex items-center border border-surface-300 rounded-xl overflow-hidden shrink-0">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 text-sm">−</button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 text-sm">+</button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="hidden sm:flex p-2 text-ink-muted hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Qty + delete drop to their own row on mobile */}
                  <div className="flex sm:hidden items-center justify-between gap-3 mt-3 pt-3 border-t border-surface-100">
                    <div className="flex items-center border border-surface-300 rounded-xl overflow-hidden shrink-0">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 text-sm">−</button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 text-sm">+</button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-red-500 transition-colors">
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="card p-6 h-fit sticky top-24 min-w-0 w-full">
              <h2 className="font-display text-xl font-semibold mb-6">Order Summary</h2>
              <div className="space-y-3 mb-6">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-ink-secondary truncate mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">{formatPrice((item.price * item.quantity))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm text-ink-secondary">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
              </div>
              <div className="border-t border-surface-200 pt-4 mb-6">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total())}</span>
                </div>
              </div>
              <button
                onClick={handleCheckoutClick}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Checkout <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth popup */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onContinueAsGuest={() => { setShowAuthModal(false); router.push('/checkout') }}
          onAuthSuccess={() => { setShowAuthModal(false); router.push('/checkout') }}
        />
      )}
    </>
  )
}
