export default function Loading() {
  return (
    <div className="section-pad pt-24 pb-20 animate-pulse">
      <div className="container-xl grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square rounded-3xl bg-surface-100" />
        <div className="space-y-4">
          <div className="h-3 w-24 bg-surface-100 rounded-lg" />
          <div className="h-8 w-3/4 bg-surface-100 rounded-lg" />
          <div className="h-5 w-20 bg-surface-100 rounded-lg" />
          <div className="h-24 w-full bg-surface-100 rounded-2xl mt-6" />
          <div className="h-12 w-full bg-surface-100 rounded-2xl mt-6" />
        </div>
      </div>
    </div>
  )
}
