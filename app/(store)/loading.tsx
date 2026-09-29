import { ProductGridSkeleton } from '@/components/store/Skeletons'

export default function Loading() {
  return (
    <div>
      <div className="h-[70vh] bg-surface-100 animate-pulse" />
      <div className="relative -mt-8 sm:-mt-12 bg-surface-0 rounded-t-[2rem] sm:rounded-t-[3rem] z-10 section-pad py-10 sm:py-14">
        <div className="container-xl">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  )
}
