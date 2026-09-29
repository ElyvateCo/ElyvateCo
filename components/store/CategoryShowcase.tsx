import Link from 'next/link'
import Image from 'next/image'
import type { Category } from '@/lib/supabase'
import { FolderTree } from 'lucide-react'

export default function CategoryShowcase({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <section className="section-pad py-10 sm:py-14 bg-surface-50">
      <div className="container-xl">
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink-primary">
            Shop by Category
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible scrollbar-hide">
          {categories.map(cat => (
            <Link
              key={cat.id}
              href={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group relative shrink-0 w-40 sm:w-auto aspect-square rounded-2xl overflow-hidden bg-surface-200"
            >
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 160px, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50">
                  <FolderTree size={28} className="text-brand-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 text-white font-display font-semibold text-sm sm:text-base leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
