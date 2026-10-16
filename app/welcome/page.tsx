import { ROOT_DOMAIN } from '@/lib/rootDomain'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Store, LayoutDashboard, Wallet, Globe, Smartphone, Palette,
  ArrowRight, Check, ChevronDown, ShieldCheck, Truck, BarChart3, Heart, type LucideIcon,
} from 'lucide-react'
import HeroArt from '@/components/landing/HeroArt'
import LiveStoreDemo from '@/components/landing/LiveStoreDemo'
import HowItWorks from '@/components/landing/HowItWorks'
import { supabaseServer } from '@/lib/supabase-server'
import { getOwnedStore } from '@/lib/ownedStore'
import { loadLanding } from '@/lib/landing'
import type { IconKey } from '@/lib/landingDefaults'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Elyvate — Launch your online store in minutes',
  description:
    'Elyvate helps sellers in Bangladesh build a real online store — manage products and orders, and get paid with local payment methods.',
}

// Preview-mode storefront link (see middleware.ts) — becomes a real
// subdomain automatically once NEXT_PUBLIC_ROOT_DOMAIN is set.
function storeLink(subdomain: string): string {
  const root = ROOT_DOMAIN
  return root ? `https://${subdomain}.${root}` : `/?store=${subdomain}`
}

const ICONS: Record<IconKey, LucideIcon> = {
  store: Store, dashboard: LayoutDashboard, wallet: Wallet, globe: Globe, phone: Smartphone,
  palette: Palette, shield: ShieldCheck, truck: Truck, chart: BarChart3, heart: Heart,
}

export default async function PlatformLandingPage() {
  const { data: { user } } = await supabaseServer().auth.getUser()
  const store = user ? await getOwnedStore() : null
  const c = await loadLanding()   // text edited in the main admin → Landing page

  // Signed-in merchant: swap every "log in / sign up" prompt for direct
  // links into their own store, instead of asking them to sign up again.
  const primaryHref  = store ? '/go-admin' : '/signup'
  const primaryLabel = store ? 'Go to admin panel' : 'Start your free store'

  return (
    <div className="min-h-screen bg-surface-0 text-ink-primary">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-surface-0/90 backdrop-blur border-b border-surface-200">
        <div className="container-xl section-pad h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold">Elyvate</Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-ink-secondary">
            <a href="#features" className="hover:text-ink-primary">Features</a>
            <a href="#how" className="hover:text-ink-primary">How it works</a>
            <a href="#pricing" className="hover:text-ink-primary">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            {store ? (
              <>
                <Link href={storeLink(store.subdomain)} className="text-sm font-medium px-3 py-2 text-ink-secondary hover:text-ink-primary">
                  My store
                </Link>
                <Link href="/go-admin" className="btn-primary !px-4 !py-2">Admin panel</Link>
              </>
            ) : user ? (
              <Link href="/onboarding" className="btn-primary !px-4 !py-2">Finish setup</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium px-3 py-2 text-ink-secondary hover:text-ink-primary">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary !px-4 !py-2">Start free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden section-pad pt-16 pb-20 md:pt-24 md:pb-28 bg-gradient-to-b from-brand-50/60 to-transparent">
        <HeroArt />
        <div className="relative z-10 container-xl max-w-3xl text-center">
          <span className="inline-block text-xs font-semibold bg-white text-brand-700 border border-brand-100 px-3 py-1 rounded-full mb-6">
            {c.hero.badge}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight">
            {c.hero.headline} <span className="text-brand-600">{c.hero.highlight}</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-ink-secondary max-w-2xl mx-auto">{c.hero.subtitle}</p>

          <div className="mt-8">
            {store ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={primaryHref} className="btn-primary inline-flex items-center justify-center gap-2 !px-8 !py-4">
                  {primaryLabel} <ArrowRight size={16} />
                </Link>
                <a href="#how" className="btn-outline inline-flex items-center justify-center !px-8 !py-4">
                  See how it works
                </a>
              </div>
            ) : null}
          </div>

          {c.hero.chips.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-secondary">
              <span className="text-ink-muted">Get paid with</span>
              {c.hero.chips.map(m => (
                <span key={m} className="font-semibold bg-white border border-surface-200 px-3 py-1 rounded-full">{m}</span>
              ))}
            </div>
          )}
          {c.hero.note && <p className="mt-4 text-xs text-ink-muted">{c.hero.note}</p>}
        </div>

        {!store && (
          <div className="relative z-10 container-xl max-w-4xl mt-14">
            <LiveStoreDemo rootDomain={ROOT_DOMAIN || 'elyvateco.com'} />
          </div>
        )}
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      {c.features.show && (
        <section id="features" className="section-pad py-16 md:py-20 bg-surface-50">
          <div className="container-xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-semibold">{c.features.title}</h2>
              {c.features.subtitle && <p className="mt-3 text-ink-secondary">{c.features.subtitle}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.features.items.map(({ icon, title, text, badge }) => {
                const Icon = ICONS[icon] ?? Store
                return (
                  <div key={title} className="card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                        <Icon size={20} />
                      </div>
                      {badge && (
                        <span className="text-[11px] font-medium bg-surface-100 text-ink-secondary px-2.5 py-1 rounded-full">{badge}</span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1.5">{title}</h3>
                    <p className="text-sm text-ink-secondary leading-relaxed">{text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ────────────────────────────────────────── */}
      {c.how.show && (
        <section id="how" className="section-pad py-16 md:py-20">
          <div className="container-xl max-w-4xl">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12">{c.how.title}</h2>
            <HowItWorks steps={c.how.steps.map((st, i) => ({ n: String(i + 1), ...st }))} />
          </div>
        </section>
      )}

      {/* ── Pricing ─────────────────────────────────────────────── */}
      {c.pricing.show && (
        <section id="pricing" className="section-pad py-16 md:py-20 bg-surface-50">
          <div className="container-xl max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-semibold">{c.pricing.title}</h2>
              {c.pricing.subtitle && <p className="mt-3 text-ink-secondary">{c.pricing.subtitle}</p>}
            </div>

            <div className={`grid gap-5 ${c.pricing.plans.length >= 3 ? 'md:grid-cols-3' : c.pricing.plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'max-w-md mx-auto'}`}>
              {c.pricing.plans.map(plan => (
                <div key={plan.name} className={`card p-8 ${plan.highlight ? 'ring-2 ring-brand-600' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    {plan.tag && <span className="text-[11px] font-medium bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">{plan.tag}</span>}
                  </div>
                  <p className="font-display text-4xl font-semibold mt-2 mb-6">{plan.price}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                        <Check size={16} className="text-brand-600 mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className={`${plan.highlight ? 'btn-primary' : 'btn-outline'} block text-center`}>{plan.cta}</Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Questions ───────────────────────────────────────────── */}
      {c.faq.show && (
        <section className="section-pad py-16 md:py-20">
          <div className="container-xl max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-8">{c.faq.title}</h2>
            <div className="space-y-3">
              {c.faq.items.map(({ q, a }) => (
                <details key={q} className="group card p-5">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold">
                    {q}
                    <ChevronDown size={18} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-ink-secondary leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final call to action ────────────────────────────────── */}
      <section className="section-pad py-16 md:py-24">
        <div className="container-xl max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold">
            {store ? c.cta.storeTitle : c.cta.title}
          </h2>
          <p className="mt-3 text-ink-secondary">
            {store ? c.cta.storeText : c.cta.text}
          </p>
          <Link href={primaryHref} className="btn-primary inline-flex items-center gap-2 mt-8 !px-8 !py-4">
            {primaryLabel} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="section-pad py-8 border-t border-surface-200">
        <div className="container-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-muted">
          <span>© {new Date().getFullYear()} Elyvate. All rights reserved.</span>
          <div className="flex gap-5">
            {store ? (
              <Link href="/go-admin" className="hover:text-ink-primary">Admin panel</Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-ink-primary">Log in</Link>
                <Link href="/signup" className="hover:text-ink-primary">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
