import { Truck, ShieldCheck, RefreshCw } from 'lucide-react'

const features = [
  { icon: Truck,       label: 'Free Shipping' },
  { icon: ShieldCheck, label: 'Secure Payment' },
  { icon: RefreshCw,   label: '30-Day Returns' },
]

export default function FeaturesBar() {
  return (
    <section className="section-pad">
      <div className="container-xl">
        <div className="grid grid-cols-3 divide-x divide-surface-200 border-y border-surface-200">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 py-5 px-2 text-center">
              <Icon size={20} className="text-brand-600" />
              <span className="text-xs sm:text-sm font-medium text-ink-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
