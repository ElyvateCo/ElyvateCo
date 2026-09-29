import Link from 'next/link'
import { Product } from '@/lib/supabase'
import ProductCardCompact from './ProductCardCompact'

export default function PopularProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <section className="pt-8 sm:pt-12">
      <div className="container-xl section-pad flex items-end justify-between mb-5">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-primary">
          Popular Products
        </h2>
        <Link href="/products" className="text-sm font-medium text-ink-primary underline shrink-0 hover:text-brand-600">
          View all
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 px-4 sm:px-6 lg:px-8 snap-x snap-mandatory scrollbar-hide">
        {products.map(product => (
          <ProductCardCompact key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
