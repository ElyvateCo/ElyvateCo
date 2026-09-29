'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, X, ArrowRight, LogIn } from 'lucide-react'
import { useWishlist } from '@/lib/wishlistStore'
import { useCart } from '@/lib/cartStore'
import toast from 'react-hot-toast'

export default function WishlistPage() {
  const { items, removeItem, loading, isLoggedIn } = useWishlist()
  const { addItemMinimal } = useCart()
  const [moving, setMoving] = useState<string | null>(null)

  function handleMoveToCart(item: typeof items[number]) {
    if (item.stock_status === 'out_of_stock') {
      toast.error('This item is currently out of stock')
      return
    }
    setMoving(item.id)
    addItemMinimal({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      slug: item.slug,
    })
    toast.success(`${item.name} added to cart!`)
    setTimeout(() => {
      removeItem(item.id)
      setMoving(null)
    }, 300)
  }

  // Logged-out state — wishlist is account-bound, so guests need to sign in first
  if (!loading && !isLoggedIn) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 section-pad pt-28 pb-20">
      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center">
        <Heart size={28} className="text-brand-600" />
      </div>
      <h2 className="font-display text-2xl text-ink-primary text-center">Login to save your favorite products</h2>
      <p className="text-ink-secondary text-sm text-center max-w-xs">Your wishlist is saved to your account, so it follows you across any device you log into.</p>
      <Link href="/account/login" className="btn-primary flex items-center gap-2">
        <LogIn size={16} /> Sign In
      </Link>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 section-pad pt-28 pb-20">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
        <Heart size={28} className="text-red-400" />
      </div>
      <h2 className="font-display text-2xl text-ink-primary">Your wishlist is empty</h2>
      <p className="text-ink-secondary text-sm text-center max-w-xs">Tap the heart icon on any product to save it here for later.</p>
      <Link href="/products" className="btn-primary">Browse Products</Link>
    </div>
  )

  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your Favorites</h1>
            <p className="text-ink-secondary text-sm mt-1">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          {items.map(item => (
            <div key={item.id} className="card overflow-hidden min-w-0 w-full group">
              <div className="relative">
                <Link href={`/products/${item.slug}`} className="block">
                  <div className="relative aspect-square bg-surface-100 overflow-hidden">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    {item.stock_status === 'out_of_stock' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-surface-0 text-ink-primary text-xs font-semibold px-3 py-1.5 rounded-xl">Out of Stock</span>
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove from wishlist"
                  className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-surface-0/90 backdrop-blur-sm shadow-card flex items-center justify-center text-ink-muted hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4">
                <Link href={`/products/${item.slug}`}>
                  <h3 className="text-sm font-semibold text-ink-primary leading-snug mb-2 break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden hover:text-brand-600 transition-colors">
                    {item.name}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base font-bold text-ink-primary">${item.price.toFixed(2)}</span>
                  {item.compare_price && (
                    <span className="text-xs text-ink-muted line-through">${item.compare_price.toFixed(2)}</span>
                  )}
                </div>

                <button
                  onClick={() => handleMoveToCart(item)}
                  disabled={item.stock_status === 'out_of_stock' || moving === item.id}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {moving === item.id ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><ShoppingCart size={14} /> Add to Cart</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/products" className="text-sm text-brand-600 font-medium hover:underline inline-flex items-center gap-1">
            Continue shopping <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
