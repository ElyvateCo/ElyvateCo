import type { Metadata } from 'next'
import StoreNotFound from '@/components/StoreNotFound'
import { getCurrentStore } from '@/lib/currentStore'

export const metadata: Metadata = {
  title: 'Not found — Elyvate',
  robots: { index: false },
}

// Shown for every 404 that isn't inside a store's own pages:
//  - the address points at a store that doesn't exist ("Store not found")
//  - a store exists but the URL isn't a real page ("Page not found")
export default async function NotFound() {
  const store = await getCurrentStore()
  if (!store) return <StoreNotFound />

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 section-pad">
      <div className="card p-8 w-full max-w-md text-center">
        <p className="text-brand-600 text-sm font-medium tracking-widest uppercase mb-2">404</p>
        <h1 className="font-display text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-ink-secondary mb-6">This page doesn&apos;t exist.</p>
        <a href="/" className="btn-primary w-full inline-block">Back to {store.store_name}</a>
      </div>
    </div>
  )
}
