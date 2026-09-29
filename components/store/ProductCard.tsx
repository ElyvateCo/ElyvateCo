'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ShoppingCart } from 'lucide-react'
import { Product } from '@/lib/supabase'
import { useCart } from '@/lib/cartStore'
import WishlistButton from './WishlistButton'
import toast from 'react-hot-toast'

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const img = product.images?.[0] ?? '/placeholder.png'

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addItem(product)
    toast.success(`${product.name} added to cart!`)
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="card overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square bg-surface-100 overflow-hidden">
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.compare_price && (
            <span className="absolute top-3 left-3 bg-brand-600 text-white text-xs font-semibold px-2.5 py-1 rounded-xl">
              SALE
            </span>
          )}
          <WishlistButton product={product} size={15} className="absolute top-3 right-3 w-8 h-8 shadow-card" />
        </div>

        {/* Info */}
        <div className="p-4">
          {/* Rating */}
          {product.review_count > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-xs text-ink-secondary font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-xs text-ink-muted">({product.review_count})</span>
            </div>
          )}

          <h3 className="text-sm font-semibold text-ink-primary leading-snug mb-1 break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
            {product.name}
          </h3>

          {/* Price row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-ink-primary">
                ${product.price.toFixed(2)}
              </span>
              {product.compare_price && (
                <span className="text-xs text-ink-muted line-through">
                  ${product.compare_price.toFixed(2)}
                </span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center hover:bg-brand-700 transition-colors"
            >
              <ShoppingCart size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
