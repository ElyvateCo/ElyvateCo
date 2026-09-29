'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from './supabase'

export type CartItem = {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  slug: string
}

type CartStore = {
  items: CartItem[]
  addItem: (product: Product) => void
  addItemMinimal: (item: { id: string; name: string; price: number; image: string; slug: string }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  total: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find(i => i.id === product.id)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          return {
            items: [...state.items, {
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.images?.[0] ?? '',
              quantity: 1,
              slug: product.slug,
            }],
          }
        })
      },

      // Lightweight variant used when only minimal item data is available,
      // e.g. moving an item from the wishlist (which doesn't store every
      // Product field) into the cart.
      addItemMinimal: (item) => {
        set((state) => {
          const existing = state.items.find(i => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        })
      },

      removeItem: (id) =>
        set(state => ({ items: state.items.filter(i => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set(state => ({
          items: quantity < 1
            ? state.items.filter(i => i.id !== id)
            : state.items.map(i => i.id === id ? { ...i, quantity } : i),
        })),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'elyvate-cart' }
  )
)
