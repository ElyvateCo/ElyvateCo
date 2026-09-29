import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Store, LayoutDashboard, Wallet, Globe, Smartphone, Palette,
  ArrowRight, Check,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Elyvate — Launch your online store in minutes',
  description:
    'Elyvate helps sellers in Bangladesh build a real online store — manage products and orders, and get paid with local payment methods.',
}

const FEATURES = [
  {
    icon: Store,
    title: 'Your own store, instantly',
    text: 'Get your own web address like yourshop.elyvate.com the moment you sign up.',
  },
  {
    icon: LayoutDashboard,
    title: 'One simple dashboard',
    text: 'Products, orders, coupons, reviews and customer messages — all in one place.',
  },
  {
    icon: Wallet,
    title: 'Local payments',
    text: 'Get paid with bKash and Nagad, straight to your own account.',
    badge: 'Rolling out',
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
    text: 'Pick your colors, write your headline and add announcements — no code needed.',
  },
]

const STEPS = [
  { n: '1', title: 'Sign up', text: 'Create your account and choose your store name and address.' },
  { n: '2', title: 'Set up your store', text: 'Tell us what you sell and pick your colors. Takes about two minutes.' },
  { n: '3', title: 'Add products & share', text: 'Add your products, then share your store link with your customers.' },
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

export default function PlatformLandingPage() {
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
            <Link href="/login" className="text-sm font-medium px-3 py-2 text-ink-secondary hover:text-ink-primary">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary !px-4 !py-2">Start free</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="section-pad pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="container-xl max-w-3xl text-center">
          <span className="inline-block text-xs font-medium bg-brand-50 text-brand-700 px-3 py-1 rounded-full mb-6">
            Built for sellers in Bangladesh
          </span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight">
            Your online store, live in minutes.
          </h1>
          <p className="mt-6 text-base md:text-lg text-ink-secondary max-w-2xl mx-auto">
            Turn your Facebook page into a real online store. Add your products, take orders and
            manage everything from one simple dashboard — no coding, no headaches.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn-primary inline-flex items-center justify-center gap-2 !px-8 !py-4">
              Start your free store <ArrowRight size={16} />
            </Link>
            <a href="#how" className="btn-outline inline-flex items-center justify-center !px-8 !py-4">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-ink-muted">Free to start. No credit card needed.</p>
        </div>
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
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map(s => (
              <div key={s.n} className="text-center md:text-left">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center mx-auto md:mx-0 mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
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

      {/* ── Final call to action ────────────────────────────────── */}
      <section className="section-pad py-16 md:py-24">
        <div className="container-xl max-w-2xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold">Ready to open your store?</h2>
          <p className="mt-3 text-ink-secondary">It takes about two minutes to get started.</p>
          <Link href="/signup" className="btn-primary inline-flex items-center gap-2 mt-8 !px-8 !py-4">
            Start your free store <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="section-pad py-8 border-t border-surface-200">
        <div className="container-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-muted">
          <span>© {new Date().getFullYear()} Elyvate. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-ink-primary">Log in</Link>
            <Link href="/signup" className="hover:text-ink-primary">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
