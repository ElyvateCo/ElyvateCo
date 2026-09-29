import Loader from '@/components/ui/loader'

export default function Loading() {
  return (
    <div className="section-pad pt-28 pb-20 bg-surface-50 min-h-screen flex items-center justify-center">
      <Loader size="sm" title="Loading your account..." subtitle="Just a moment" />
    </div>
  )
}
