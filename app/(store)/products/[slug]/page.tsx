import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentStore } from '@/lib/currentStore'
import ProductPageClient from './ProductPageClient'

export const revalidate = 60

async function getProduct(slug: string) {
  // Slugs are only unique WITHIN a store, so always match on both
  const store = await getCurrentStore()
  if (!store) return null
  const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('slug', slug).maybeSingle()
  return data
}

// Generates real, unique metadata per product — this is what shows up in
// Google search results, WhatsApp/iMessage link previews, and social shares.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug)

  if (!product) {
    return { title: 'Product Not Found — Elyvate' }
  }

  const title       = `${product.name} — Elyvate`
  const description = product.description?.slice(0, 155) || `Shop ${product.name} at Elyvate. Free worldwide shipping, 30-day returns.`
  const image        = product.images?.[0]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, width: 1200, height: 1200, alt: product.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug)

  if (!product) notFound()

  return <ProductPageClient slug={params.slug} initialProduct={product} />
}
