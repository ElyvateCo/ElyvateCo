import Link from 'next/link'
import { Instagram, Facebook } from 'lucide-react'

const TikTokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.26 8.26 0 0 0 4.83 1.54V6.78a4.85 4.85 0 0 1-1.07-.09z"/>
  </svg>
)

export default function Footer() {
  return (
    <footer className="bg-[#111111] text-white">
      <div className="container-xl section-pad py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-2xl font-semibold mb-3">Elyvate</p>
            <p className="text-sm text-white/60 leading-relaxed mb-5">Premium ambient lighting & projection gadgets that transform any room into an experience.</p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white">
                <Instagram size={15} />
              </a>
              <a href="#" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white">
                <TikTokIcon />
              </a>
              <a href="#" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white">
                <Facebook size={15} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Shop</p>
            <ul className="space-y-2.5">
              {[['All Products', '/products'], ['New Arrivals', '/products'], ['Track Order', '/track-order']].map(([label, href]) => (
                <li key={label}><Link href={href} className="text-sm text-white/70 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Support</p>
            <ul className="space-y-2.5">
              {[['Contact Us', '/contact'], ['Shipping Policy', '/shipping-policy'], ['Returns & Refunds', '/returns-policy']].map(([label, href]) => (
                <li key={label}><Link href={href} className="text-sm text-white/70 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Legal</p>
            <ul className="space-y-2.5">
              {[['Privacy Policy', '/privacy-policy'], ['Terms of Service', '/privacy-policy']].map(([label, href]) => (
                <li key={label}><Link href={href} className="text-sm text-white/70 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Elyvate. All rights reserved.</p>
          <p className="text-xs text-white/40">Payments secured by 2Checkout · SSL encrypted</p>
        </div>
      </div>
    </footer>
  )
}
