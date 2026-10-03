'use client'
import { formatPrice } from '@/lib/money'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ShoppingCart, Zap, Truck, ShieldCheck, RefreshCw, Headphones, ZoomIn, X, ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/supabase'
import { useStoreId } from '@/lib/storeContext'
import { useCart } from '@/lib/cartStore'
import WishlistButton from '@/components/store/WishlistButton'
import PromoVideoPopup from '@/components/store/PromoVideoPopup'
import toast from 'react-hot-toast'

type Review = { id: string; author_name: string; rating: number; body: string; created_at: string }

export default function ProductPageClient({ slug, initialProduct }: { slug: string; initialProduct: Product | null }) {
  const storeId = useStoreId()
  const [product, setProduct]   = useState<Product | null>(initialProduct)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty]           = useState(1)
  const [zoomed, setZoomed]     = useState(false)
  const [reviews, setReviews]   = useState<Review[]>([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, body: '' })
  const [submitting, setSubmitting] = useState(false)
  const [added, setAdded]       = useState(false)
  const { addItem } = useCart()
  const router = useRouter()
  const stickyRef = useRef<HTMLDivElement>(null)
  const mainBtnRef = useRef<HTMLButtonElement>(null)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    // Product is already provided by the server for instant first paint.
    // Still fetch reviews client-side since those change frequently.
    if (initialProduct) {
      fetchReviews(initialProduct.id)
    } else {
      // Fallback: if no initial product was passed (e.g. direct client nav edge case)
      if (!storeId) return
      supabase.from('products').select('*').eq('store_id', storeId).eq('slug', slug).maybeSingle().then(({ data }) => {
        setProduct(data)
        if (data) fetchReviews(data.id)
      })
    }
  }, [slug, initialProduct, storeId])

  async function fetchReviews(productId: string) {
    const res  = await fetch(`/api/reviews?productId=${productId}`)
    const data = await res.json()
    setReviews(Array.isArray(data) ? data : [])
  }

  // Show sticky bar when main button scrolls out of view
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting), { threshold: 0 })
    if (mainBtnRef.current) obs.observe(mainBtnRef.current)
    return () => obs.disconnect()
  }, [product])

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  function handleAddToCart() {
    if (!product) return
    for (let i = 0; i < qty; i++) addItem(product)
    setAdded(true)
    toast.success('Added to cart!')
    setTimeout(() => setAdded(false), 2000)
  }

  function handleBuyNow() {
    if (!product) return
    for (let i = 0; i < qty; i++) addItem(product)
    router.push('/checkout')
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return
    setSubmitting(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, authorName: reviewForm.name, rating: reviewForm.rating, body: reviewForm.body }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Review submitted! It will appear after approval.')
      setReviewForm({ name: '', rating: 5, body: '' })
      setShowReviewForm(false)
    } else {
      toast.error('Failed to submit review.')
    }
  }

  const images       = product.images ?? []
  const videos       = product.product_videos ?? []
  // Gallery = videos first, then images
  // Each item: { type: 'video'|'image', src: string }
  type GalleryItem = { type: 'video' | 'image'; src: string }
  const gallery: GalleryItem[] = [
    ...videos.map(v => ({ type: 'video' as const, src: v })),
    ...images.map(i => ({ type: 'image' as const, src: i })),
  ]
  const activeItem = gallery[activeImg] ?? null
  const avgRating = reviews.length > 0 ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length : product.rating
  const discount  = product.compare_price ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0

  const trustBadges = [
    { icon: Truck,       text: 'Free Worldwide Shipping' },
    { icon: RefreshCw,   text: '30-Day Returns'          },
    { icon: ShieldCheck, text: 'Secure Payment'          },
    { icon: Headphones,  text: '24/7 Support'            },
  ]

  return (
    <>
      <div className="section-pad pt-24 pb-32 md:pb-20">
        <div className="container-xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-ink-muted mb-8">
            <Link href="/" className="hover:text-ink-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-ink-primary transition-colors">Products</Link>
            <span>/</span>
            <span className="text-ink-primary">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
            {/* ── Gallery ── */}
            <div className="space-y-3">

              {/* Main display */}
              <div
                className={`relative aspect-square rounded-3xl overflow-hidden bg-surface-100 group ${activeItem?.type === 'image' ? 'cursor-zoom-in' : ''}`}
                onClick={() => activeItem?.type === 'image' && setZoomed(true)}
              >
                {activeItem?.type === 'video' ? (
                  <video
                    key={activeItem.src}
                    src={activeItem.src}
                    className="w-full h-full object-cover"
                    controls autoPlay muted loop playsInline
                  />
                ) : activeItem?.type === 'image' ? (
                  <>
                    <Image
                      src={activeItem.src}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 bg-surface-0/80 backdrop-blur-sm rounded-xl p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={16} className="text-ink-primary" />
                    </div>
                  </>
                ) : null}

                {discount > 0 && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl">
                    -{discount}%
                  </div>
                )}

                {/* Prev / Next arrows — only when gallery has multiple items */}
                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + gallery.length) % gallery.length) }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-surface-0/80 backdrop-blur-sm shadow flex items-center justify-center text-ink-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-0"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % gallery.length) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-surface-0/80 backdrop-blur-sm shadow flex items-center justify-center text-ink-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-0"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail strip — single horizontal row, scrollable */}
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {gallery.map((item, i) => {
                    const isActive = activeImg === i
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={`relative shrink-0 w-[72px] h-[72px] rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                          isActive
                            ? 'border-brand-600 opacity-100 scale-100'
                            : 'border-surface-200 opacity-60 hover:opacity-90 hover:border-surface-400'
                        }`}
                      >
                        {item.type === 'video' ? (
                          <>
                            <video
                              src={item.src}
                              className="w-full h-full object-cover"
                              muted playsInline
                            />
                            {/* Play icon overlay */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-colors ${isActive ? 'bg-brand-600/40' : 'bg-black/35'}`}>
                              <div className="w-7 h-7 rounded-full bg-surface-0/90 flex items-center justify-center shadow">
                                <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                                  <path d="M1 1l8 5-8 5V1z" fill="#1a1a1a"/>
                                </svg>
                              </div>
                            </div>
                          </>
                        ) : (
                          <Image src={item.src} alt="" fill sizes="64px" className="object-cover" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Dot indicators — shows position in gallery */}
              {gallery.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`rounded-full transition-all duration-200 ${
                        activeImg === i
                          ? 'w-5 h-1.5 bg-brand-600'
                          : 'w-1.5 h-1.5 bg-surface-300 hover:bg-surface-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Details ── */}
            <div className="flex flex-col">
              <p className="text-xs text-brand-600 font-semibold uppercase tracking-widest mb-2">{product.category}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink-primary leading-tight mb-4">{product.name}</h1>

              {/* Rating row */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={15} className={i < Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-surface-300 fill-surface-300'} />)}</div>
                <span className="text-sm text-ink-secondary">{avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-ink-primary">{formatPrice(product.price)}</span>
                {product.compare_price && <span className="text-lg text-ink-muted line-through">{formatPrice(product.compare_price)}</span>}
                {discount > 0 && <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-xl">Save {discount}%</span>}
              </div>

              {/* Shipping estimate */}
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-2xl px-4 py-2.5 mb-6 w-fit">
                <Truck size={15} className="shrink-0" />
                <span>Estimated delivery: <strong>7–14 business days</strong></span>
              </div>

              <p className="text-ink-secondary leading-relaxed mb-6">{product.description}</p>

              {/* Bullet points */}
              {product.bullet_points && product.bullet_points.length > 0 && (
                <div className="mb-8 space-y-2.5">
                  {product.bullet_points.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-sm text-ink-secondary leading-relaxed">{point}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Qty + Add to cart + Buy now */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center border border-surface-300 rounded-2xl overflow-hidden shrink-0">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-12 flex items-center justify-center hover:bg-surface-100 transition-colors text-ink-primary font-medium text-lg">−</button>
                  <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-11 h-12 flex items-center justify-center hover:bg-surface-100 transition-colors text-ink-primary font-medium text-lg">+</button>
                </div>
                <WishlistButton product={product} size={18} className="w-12 h-12 border border-surface-300 shrink-0" />
              </div>
              <div className="flex items-center gap-3 mb-6">
                <button
                  ref={mainBtnRef}
                  onClick={handleAddToCart}
                  className={`btn-secondary flex-1 min-w-0 flex items-center justify-center gap-2 py-4 transition-all ${added ? 'bg-green-100 text-green-700' : ''}`}
                >
                  <ShoppingCart size={16} />
                  {added ? 'Added!' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 min-w-0 flex items-center justify-center gap-2 py-4 rounded-2xl font-medium text-sm bg-[#111111] text-white hover:bg-black active:scale-[0.98] transition-all duration-200 shadow-sm"
                >
                  <Zap size={16} />
                  Buy Now
                </button>
              </div>

              {/* Trust badges grid */}
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-surface-200">
                {trustBadges.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 p-3 bg-surface-50 rounded-2xl">
                    <Icon size={16} className="text-brand-600 shrink-0" />
                    <span className="text-xs font-medium text-ink-secondary">{text}</span>
                  </div>
                ))}
              </div>

              {/* Shipping info link */}
              <p className="text-xs text-ink-muted mt-4">
                <Link href="/shipping-policy" className="text-brand-600 hover:underline">View shipping policy</Link> · <Link href="/returns-policy" className="text-brand-600 hover:underline">30-day returns</Link>
              </p>
            </div>
          </div>

          {/* ── Reviews Section ── */}
          <div className="mt-20 border-t border-surface-200 pt-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink-primary">Customer Reviews</h2>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={13} className={i < Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-surface-200 fill-surface-200'} />)}</div>
                    <span className="text-sm text-ink-secondary">{avgRating.toFixed(1)} out of 5 · {reviews.length} reviews</span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowReviewForm(!showReviewForm)} className="btn-secondary text-sm">
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </button>
            </div>

            {/* Review form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="card p-6 mb-8">
                <h3 className="font-semibold text-ink-primary mb-5">Your Review</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Your Name</label>
                    <input required className="input" placeholder="John Doe" value={reviewForm.name} onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Rating</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(n => (
                        <button type="button" key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))} className="p-1">
                          <Star size={24} className={n <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-300 fill-surface-300'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Review</label>
                    <textarea required className="input min-h-[100px] resize-none" placeholder="Share your experience with this product..." value={reviewForm.body} onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))} />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                    {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Submit Review
                  </button>
                </div>
              </form>
            )}

            {/* Review list */}
            {reviews.length === 0 ? (
              <div className="text-center py-16 bg-surface-50 rounded-3xl">
                <Star size={36} className="text-surface-300 mx-auto mb-3" />
                <p className="text-ink-muted text-sm">No reviews yet. Be the first to review this product!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.map(r => (
                  <div key={r.id} className="card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={13} className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-200 fill-surface-200'} />)}</div>
                      <span className="text-xs text-ink-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="font-semibold text-sm text-ink-primary mb-1">{r.author_name}</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{r.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Add to Cart (mobile) ── */}
      <div className={`md:hidden fixed bottom-[62px] inset-x-0 z-40 transition-all duration-300 ${showSticky ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="bg-surface-0 border-t border-surface-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
          {images[0] && (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-100 shrink-0">
              <Image src={images[0]} alt={product.name} fill sizes="48px" className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink-primary truncate">{product.name}</p>
            <p className="text-sm font-bold text-brand-600">{formatPrice((product.price * qty))}</p>
          </div>
          <button onClick={handleAddToCart} className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl border border-surface-300 transition-all ${added ? 'bg-green-100 border-green-300 text-green-700' : 'text-ink-primary'}`} aria-label="Add to cart">
            <ShoppingCart size={16} />
          </button>
          <button onClick={handleBuyNow} className="btn-primary shrink-0 flex items-center gap-1.5 py-2.5 px-4 text-sm bg-[#111111] hover:bg-black">
            <Zap size={14} />
            Buy Now
          </button>
        </div>
      </div>

      {/* ── Image Zoom Modal — only for images, not videos ── */}
      {zoomed && activeItem?.type === 'image' && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" onClick={() => setZoomed(false)}>
            <X size={20} />
          </button>
          {gallery.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + gallery.length) % gallery.length) }}>
                <ChevronLeft size={24} />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % gallery.length) }}>
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div className="relative w-full max-w-2xl aspect-square rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <Image src={activeItem.src} alt={product.name} fill sizes="90vw" className="object-contain" />
          </div>
        </div>
      )}

      {/* ── Promo Video Popup ── triggered when user scrolls to bottom */}
      {product.promo_video_enabled && product.promo_video_url && (
        <PromoVideoPopup videoUrl={product.promo_video_url} />
      )}
    </>
  )
}
