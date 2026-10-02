import Link from 'next/link'

// A page inside a real store that doesn't exist (e.g. a deleted product).
// Rendered inside the store's normal header/footer.
export default function StorePageNotFound() {
  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-md mx-auto text-center">
        <p className="text-brand-600 text-sm font-medium tracking-widest uppercase mb-2">404</p>
        <h1 className="font-display text-3xl font-semibold mb-3">Page not found</h1>
        <p className="text-ink-secondary mb-6">
          We couldn&apos;t find what you were looking for. It may have been moved or removed.
        </p>
        <Link href="/products" className="btn-primary inline-block">Browse products</Link>
      </div>
    </div>
  )
}
