'use client'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWishlist } from '@/lib/wishlistStore'
import { Product } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Props = {
  product: Product
  size?: number
  className?: string
}

// Reusable heart toggle button — used on ProductCard, ProductCardCompact,
// and the product detail page. Wishlist requires login: guests get
// redirected to sign in instead of the action silently failing.
export default function WishlistButton({ product, size = 16, className = '' }: Props) {
  const { toggleItem, isWishlisted, isLoggedIn } = useWishlist()
  const router = useRouter()
  const active = isWishlisted(product.id)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      toast.error('Login to save your favorite products')
      router.push('/account/login')
      return
    }

    toggleItem(product)
    toast.success(active ? 'Removed from wishlist' : 'Added to wishlist!')
  }

  return (
    <button
      onClick={handleClick}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`flex items-center justify-center rounded-xl transition-all duration-200 ${
        active
          ? 'bg-red-50 text-red-500'
          : 'bg-surface-0/90 backdrop-blur-sm text-ink-muted hover:text-red-500'
      } ${className}`}
    >
      <Heart
        size={size}
        className={active ? 'fill-red-500' : ''}
        strokeWidth={2}
      />
    </button>
  )
}
