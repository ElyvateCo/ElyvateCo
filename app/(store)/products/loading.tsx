import { ProductGridSkeleton } from '@/components/store/Skeletons'

export default function Loading() {
  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl">
        <div className="mb-10">
          <div className="h-4 w-16 bg-surface-100 rounded-lg mb-3 animate-pulse" />
          <div className="h-9 w-56 bg-surface-100 rounded-lg animate-pulse" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  )
}
