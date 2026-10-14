import { ROOT_DOMAIN } from '@/lib/rootDomain'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Store, LayoutDashboard, Wallet, Globe, Smartphone, Palette,
  ArrowRight, Check, ChevronDown,
} from 'lucide-react'
import HeroArt from '@/components/landing/HeroArt'
import LiveStoreDemo from '@/components/landing/LiveStoreDemo'
import HowItWorks from '@/components/landing/HowItWorks'
import { supabaseServer } from '@/lib/supabase-server'
import { getOwnedStore } from '@/lib/ownedStore'

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

const FEATURES = [
  {
    icon: Store,
    title: 'Your own store, instantly',
    text: 'Get your own web address like yourshop.elyvateco.com the moment you sign up.',
  },
  {
    icon: LayoutDashboard,
    title: 'One simple dashboard',
    text: 'Products, orders, coupons, reviews and customer messages — all in one place.',
  },
  {
    icon: Wallet,
    title: 'Local payments',
    text: 'Cash on Delivery, bKash and Nagad — your customers pay the way they already do.',
  },
  {
    icon: Globe,
    title: 'Bring your own domain',
    text: 'Bought a domain? Connect it to your store and look fully professional.',
    badge: 'Premium',
  },
  {
    icon: Smartphone,
    title: 'Made for phones',
    text: 'Your customers shop on mobile — your store is built for it from the start.',
  },
  {
    icon: Palette,
    title: 'Make it yours',
    text: 'Pick your colors, write your headline and choose a ready-made background video — no code needed.',
  },
]

const STEPS = [
  { n: '1', title: 'Sign up', text: 'Create your account and choose your store name and address.' },
  { n: '2', title: 'Set up your store', text: 'Tell us what you sell and pick your colors. Takes about two minutes.' },
  { n: '3', title: 'Add products & share', text: 'Add your products, then share your store link with your customers.' },
]

const FAQ = [
  { q: 'Do I need my own domain?', a: 'No. You get your own store address the moment you sign up. You can connect a domain you bought later.' },
  { q: 'How do I get paid?', a: 'Customers can pay with Cash on Delivery, or send money by bKash or Nagad. You confirm each payment in your dashboard.' },
  { q: 'Is it really free?', a: 'Yes — you can open your store and start selling for free. Paid plans with extra features are coming later.' },
  { q: 'Can I use it in Bangla?', a: 'Your dashboard is in English for now. You can write your product names and descriptions in Bangla, English, or both.' },
]

const FREE_PLAN = [
  'Your own store and web address',
  'Full admin dashboard',
  'Products, orders, coupons & reviews',
  'Mobile-friendly storefront',
]

const PREMIUM_PLAN = [
  'Everything in Free',
  'Connect your own domain',
  'Higher limits than Free',
]

export default async function PlatformLandingPage() {
  const { data: { user } } = await supabaseServer().auth.getUser()
  const store = user ? await getOwnedStore() : null

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
            Built for sellers in Bangladesh
          </span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight">
            Your online store, live <span className="text-brand-600">in minutes.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-ink-secondary max-w-2xl mx-auto">
            Turn your Facebook page into a real online store. Add your products, take orders and
            manage everything from one simple dashboard — no coding, no headaches.
          </p>

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

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-secondary">
            <span className="text-ink-muted">Get paid with</span>
            {['Cash on Delivery', 'bKash', 'Nagad'].map(m => (
              <span key={m} className="font-semibold bg-white border border-surface-200 px-3 py-1 rounded-full">{m}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-muted">Free to start. No credit card needed.</p>
        </div>

        {!store && (
          <div className="relative z-10 container-xl max-w-4xl mt-14">
            <LiveStoreDemo rootDomain={ROOT_DOMAIN || 'elyvateco.com'} />
          </div>
        )}
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="section-pad py-16 md:py-20 bg-surface-50">
        <div className="container-xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Everything you need to sell online</h2>
            <p className="mt-3 text-ink-secondary">Start simple. Grow when you&apos;re ready.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, badge }) => (
              <div key={title} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  {badge && (
                    <span className="text-[11px] font-medium bg-surface-100 text-ink-secondary px-2.5 py-1 rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how" className="section-pad py-16 md:py-20">
        <div className="container-xl max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12">
            Three steps to your first sale
          </h2>
          <HowItWorks steps={STEPS} />
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="section-pad py-16 md:py-20 bg-surface-50">
        <div className="container-xl max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-semibold">Simple pricing</h2>
            <p className="mt-3 text-ink-secondary">Start free. Upgrade only when your store needs more.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="card p-8">
              <h3 className="font-semibold text-lg">Free</h3>
              <p className="font-display text-4xl font-semibold mt-2 mb-6">Free</p>
              <ul className="space-y-3 mb-8">
                {FREE_PLAN.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                    <Check size={16} className="text-brand-600 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary block text-center">Start free</Link>
            </div>

            <div className="card p-8 ring-2 ring-brand-600">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Premium</h3>
                <span className="text-[11px] font-medium bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                  Free during beta
                </span>
              </div>
              <p className="font-display text-4xl font-semibold mt-2 mb-6">Coming soon</p>
              <ul className="space-y-3 mb-8">
                {PREMIUM_PLAN.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                    <Check size={16} className="text-brand-600 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-outline block text-center">Join the beta</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Questions ───────────────────────────────────────────── */}
      <section className="section-pad py-16 md:py-20">
        <div className="container-xl max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-8">Questions, answered</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
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

      {/* ── Final call to action ────────────────────────────────── */}
      <section className="section-pad py-16 md:py-24">
        <div className="container-xl max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold">
            {store ? 'Ready to add more products?' : 'Ready to open your store?'}
          </h2>
          <p className="mt-3 text-ink-secondary">
            {store ? 'Jump back into your dashboard.' : 'It takes about two minutes to get started.'}
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
