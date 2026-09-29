import { ProductGridSkeleton } from '@/components/store/Skeletons'

export default function Loading() {
  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl">
        <div className="h-8 w-40 bg-surface-100 rounded-lg mb-8 animate-pulse" />
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  )
}
