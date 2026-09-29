import { OrderListSkeleton } from '@/components/store/Skeletons'

export default function Loading() {
  return (
    <div className="section-pad pt-28 pb-20 bg-surface-50 min-h-screen">
      <div className="container-xl max-w-2xl">
        <div className="h-8 w-48 bg-surface-100 rounded-lg mb-8 animate-pulse" />
        <OrderListSkeleton count={3} />
      </div>
    </div>
  )
}
