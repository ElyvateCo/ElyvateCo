'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase'
import type { Product } from '@/lib/supabase'
import ProductCard from '@/components/store/ProductCard'
import { useStoreId } from '@/lib/storeContext'
import { ProductGridSkeleton } from '@/components/store/Skeletons'

export default function SearchPage() {
  const storeId = useStoreId()
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Product[]>([])
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // NO auto-focus — user taps the field when they're ready

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim() || !storeId) {
      setResults([])
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const sb = supabaseBrowser()
      const { data } = await sb
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .eq('stock_status', 'in_stock')
        .limit(20)

      setResults(data ?? [])
      setSearched(true)
      setLoading(false)
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, storeId])

  return (
    <div className="section-pad pt-24 pb-20">
      <div className="container-xl max-w-4xl">

        {/* Search bar — user taps it manually */}
        <div className="relative mb-8">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search galaxy projectors, home decor…"
            className="w-full pl-12 pr-12 py-4 rounded-2xl border border-surface-300 bg-surface-0 text-ink-primary placeholder:text-ink-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-card transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.blur() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-surface-100 text-ink-muted hover:text-ink-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-2">
            <ProductGridSkeleton count={6} />
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <div>
            <p className="text-sm text-ink-secondary mb-5">
              {results.length > 0
                ? <><span className="font-semibold text-ink-primary">{results.length}</span> result{results.length !== 1 ? 's' : ''} for "<span className="font-medium text-brand-600">{query}</span>"</>
                : <>No results for "<span className="font-medium">{query}</span>"</>
              }
            </p>

            {results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Search size={40} className="text-surface-300 mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-ink-primary mb-2">Nothing found</h3>
                <p className="text-sm text-ink-secondary">Try different keywords or browse all products.</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !searched && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-brand-600" />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-primary mb-2">
              Find your perfect piece
            </h2>
            <p className="text-sm text-ink-secondary max-w-xs mx-auto">
              Tap the search bar above to start searching.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
