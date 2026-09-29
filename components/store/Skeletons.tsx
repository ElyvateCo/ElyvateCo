// Reusable skeleton loaders — shown instantly while data is fetching,
// so the page never feels "blank" or stuck.

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-2xl bg-surface-100 mb-3" />
      <div className="h-3.5 bg-surface-100 rounded-lg w-3/4 mb-2" />
      <div className="h-4 bg-surface-100 rounded-lg w-1/3" />
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  )
}

export function OrderRowSkeleton() {
  return (
    <div className="bg-surface-0 rounded-2xl shadow-card p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-3 bg-surface-100 rounded-lg w-32 mb-2" />
          <div className="h-4 bg-surface-100 rounded-lg w-48 mb-2" />
          <div className="h-3 bg-surface-100 rounded-lg w-24" />
        </div>
        <div className="text-right shrink-0">
          <div className="h-4 bg-surface-100 rounded-lg w-16 mb-2" />
          <div className="h-3 bg-surface-100 rounded-lg w-12" />
        </div>
      </div>
    </div>
  )
}

export function OrderListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => <OrderRowSkeleton key={i} />)}
    </div>
  )
}
