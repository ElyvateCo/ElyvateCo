import Loader from '@/components/ui/loader'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader size="sm" title="Confirming your order..." subtitle="Just a moment" />
    </div>
  )
}
