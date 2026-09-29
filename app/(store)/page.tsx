import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { requireCurrentStore } from '@/lib/currentStore'
import HeroSection from '@/components/store/HeroSection'
import PopularProducts from '@/components/store/PopularProducts'
import FeaturesBar from '@/components/store/FeaturesBar'
import ProductGrid from '@/components/store/ProductGrid'
import CategoryShowcase from '@/components/store/CategoryShowcase'

export const dynamic = 'force-dynamic'

async function getHero(storeId: string) {
  const { data } = await supabase.from('hero_section').select('*').eq('store_id', storeId).maybeSingle()
  return data
}

async function getProducts(storeId: string) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('stock_status', 'in_stock')
    .order('created_at', { ascending: false })
  return data || []
}

async function getCategories(storeId: string) {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('display_order', { ascending: true })
  return data || []
}

export default async function HomePage() {
  const store = await requireCurrentStore()
  const [hero, products, categories] = await Promise.all([getHero(store.id), getProducts(store.id), getCategories(store.id)])

  const featured = products.filter(p => p.is_featured)
  const popular = featured.length > 0 ? featured : products

  return (
    <>
      <HeroSection hero={hero} />

      {/* White content sheet — overlaps the hero's rounded bottom corners */}
      <div className="relative -mt-8 sm:-mt-12 bg-surface-0 rounded-t-[2rem] sm:rounded-t-[3rem] z-10">
        <PopularProducts products={popular} />
        <FeaturesBar />
        <CategoryShowcase categories={categories} />

        <section className="section-pad py-10 sm:py-14">
          <div className="container-xl">
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-primary">
                New Arrivals
              </h2>
              <Link href="/products" className="text-sm font-medium text-ink-primary underline hover:text-brand-600">
                View all
              </Link>
            </div>
            <ProductGrid products={products} />
          </div>
        </section>
      </div>
    </>
  )
}
