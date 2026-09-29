import { Metadata } from 'next'
import Link from 'next/link'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { requireCurrentStore } from '@/lib/currentStore'
import ProductGrid from '@/components/store/ProductGrid'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'All Products — Elyvate',
  description: 'Shop our full collection of ambient lighting and projection gadgets. Free worldwide shipping, 30-day returns.',
}

export default async function ProductsPage({ searchParams }: { searchParams: { category?: string } }) {
  const category = searchParams?.category?.trim() || null
  const store = await requireCurrentStore()

  let query = supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('stock_status', 'in_stock')
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)

  const { data: products } = await query

  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl">
        <div className="mb-10">
          <p className="text-brand-600 text-sm font-medium tracking-widest uppercase mb-2">
            Browse
          </p>
          <h1 className="font-display text-4xl font-semibold">
            {category || 'All Products'}
          </h1>
          {category && (
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-ink-secondary hover:text-brand-600 transition-colors"
            >
              <X size={14} /> Clear filter, show all products
            </Link>
          )}
        </div>
        <ProductGrid products={products ?? []} />
      </div>
    </div>
  )
}
