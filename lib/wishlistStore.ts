'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabaseBrowser } from './supabase'
import { useAuth } from './authContext'
import { Product } from './supabase'

export type WishlistItem = {
  id: string          // product id
  name: string
  price: number
  compare_price: number | null
  image: string
  slug: string
  stock_status: 'in_stock' | 'out_of_stock'
}

// Wishlist is now account-bound, stored in Supabase, and synced across
// any device the user logs into — no localStorage involved. Logged-out
// users get an empty, read-only wishlist (gated by isLoggedIn).
export function useWishlist() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadWishlist = useCallback(async () => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const sb = supabaseBrowser()
    const { data } = await sb
      .from('wishlist_items')
      .select('product_id, products ( id, name, price, compare_price, images, slug, stock_status )')
      .eq('user_id', user.id)

    type Row = { products: { id: string; name: string; price: number; compare_price: number | null; images: string[]; slug: string; stock_status: 'in_stock' | 'out_of_stock' } | null }

    const mapped: WishlistItem[] = ((data as unknown as Row[]) ?? [])
      .filter(row => row.products)
      .map(row => ({
        id: row.products!.id,
        name: row.products!.name,
        price: row.products!.price,
        compare_price: row.products!.compare_price,
        image: row.products!.images?.[0] ?? '',
        slug: row.products!.slug,
        stock_status: row.products!.stock_status,
      }))

    setItems(mapped)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) loadWishlist()
  }, [authLoading, loadWishlist])

  const isWishlisted = useCallback(
    (productId: string) => items.some(i => i.id === productId),
    [items]
  )

  async function toggleItem(product: Product) {
    if (!user) return // gated — should never be called while logged out
    const sb = supabaseBrowser()
    const already = isWishlisted(product.id)

    if (already) {
      // Optimistic update
      setItems(prev => prev.filter(i => i.id !== product.id))
      await sb.from('wishlist_items').delete().eq('user_id', user.id).eq('product_id', product.id)
    } else {
      setItems(prev => [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        compare_price: product.compare_price ?? null,
        image: product.images?.[0] ?? '',
        slug: product.slug,
        stock_status: product.stock_status,
      }])
      await sb.from('wishlist_items').insert({ user_id: user.id, product_id: product.id })
    }
  }

  async function removeItem(productId: string) {
    if (!user) return
    setItems(prev => prev.filter(i => i.id !== productId))
    const sb = supabaseBrowser()
    await sb.from('wishlist_items').delete().eq('user_id', user.id).eq('product_id', productId)
  }

  return {
    items,
    loading,
    isLoggedIn: !!user,
    toggleItem,
    removeItem,
    isWishlisted,
    refresh: loadWishlist,
  }
}
