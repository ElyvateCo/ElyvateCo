// The landing page text. The platform owner edits it in /rafiixr → Landing
// page (saved in Supabase). These defaults are used for anything not edited.
export type IconKey = 'store' | 'dashboard' | 'wallet' | 'globe' | 'phone' | 'palette' | 'shield' | 'truck' | 'chart' | 'heart'
export const ICON_KEYS: IconKey[] = ['store', 'dashboard', 'wallet', 'globe', 'phone', 'palette', 'shield', 'truck', 'chart', 'heart']

export type LandingContent = {
  hero: { badge: string; headline: string; highlight: string; subtitle: string; note: string; chips: string[] }
  features: { show: boolean; title: string; subtitle: string; items: { icon: IconKey; title: string; text: string; badge: string }[] }
  how: { show: boolean; title: string; steps: { title: string; text: string }[] }
  pricing: {
    show: boolean; title: string; subtitle: string
    plans: { name: string; price: string; tag: string; features: string[]; cta: string; highlight: boolean }[]
  }
  faq: { show: boolean; title: string; items: { q: string; a: string }[] }
  cta: { title: string; text: string; storeTitle: string; storeText: string }
}

export const DEFAULT_LANDING: LandingContent = {
  hero: {
    badge: 'Built for sellers in Bangladesh',
    headline: 'Your online store, live',
    highlight: 'in minutes.',
    subtitle: 'Turn your Facebook page into a real online store. Add your products, take orders and manage everything from one simple dashboard — no coding, no headaches.',
    note: 'Free to start. No credit card needed.',
    chips: ['Cash on Delivery', 'bKash', 'Nagad'],
  },
  features: {
    show: true,
    title: 'Everything you need to sell online',
    subtitle: "Start simple. Grow when you're ready.",
    items: [
      { icon: 'store', title: 'Your own store, instantly', text: 'Get your own web address like yourshop.elyvateco.com the moment you sign up.', badge: '' },
      { icon: 'dashboard', title: 'One simple dashboard', text: 'Products, orders, coupons, reviews and customer messages — all in one place.', badge: '' },
      { icon: 'wallet', title: 'Local payments', text: 'Cash on Delivery, bKash and Nagad — your customers pay the way they already do.', badge: '' },
      { icon: 'globe', title: 'Bring your own domain', text: 'Bought a domain? Connect it to your store and look fully professional.', badge: 'Premium' },
      { icon: 'phone', title: 'Made for phones', text: 'Your customers shop on mobile — your store is built for it from the start.', badge: '' },
      { icon: 'palette', title: 'Make it yours', text: 'Pick your colors, write your headline and choose a ready-made background video — no code needed.', badge: '' },
    ],
  },
  how: {
    show: true,
    title: 'Three steps to your first sale',
    steps: [
      { title: 'Sign up', text: 'Create your account and choose your store name and address.' },
      { title: 'Set up your store', text: 'Tell us what you sell and pick your colors. Takes about two minutes.' },
      { title: 'Add products & share', text: 'Add your products, then share your store link with your customers.' },
    ],
  },
  pricing: {
    show: true,
    title: 'Simple pricing',
    subtitle: 'Start free. Upgrade only when your store needs more.',
    plans: [
      { name: 'Free', price: 'Free', tag: '', cta: 'Start free', highlight: false,
        features: ['Your own store and web address', 'Full admin dashboard', 'Products, orders, coupons & reviews', 'Mobile-friendly storefront'] },
      { name: 'Premium', price: 'Coming soon', tag: 'Free during beta', cta: 'Join the beta', highlight: true,
        features: ['Everything in Free', 'Connect your own domain', 'Higher limits than Free'] },
    ],
  },
  faq: {
    show: true,
    title: 'Questions, answered',
    items: [
      { q: 'Do I need my own domain?', a: 'No. You get your own store address the moment you sign up. You can connect a domain you bought later.' },
      { q: 'How do I get paid?', a: 'Customers can pay with Cash on Delivery, or send money by bKash or Nagad. You confirm each payment in your dashboard.' },
      { q: 'Is it really free?', a: 'Yes — you can open your store and start selling for free. Paid plans with extra features are coming later.' },
      { q: 'Can I use it in Bangla?', a: 'Your dashboard is in English for now. You can write your product names and descriptions in Bangla, English, or both.' },
    ],
  },
  cta: {
    title: 'Ready to open your store?',
    text: 'It takes about two minutes to get started.',
    storeTitle: 'Ready to add more products?',
    storeText: 'Jump back into your dashboard.',
  },
}

const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.trim().slice(0, max) : fallback)
const arr = <T,>(v: unknown, max: number, map: (x: Record<string, unknown>) => T): T[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').slice(0, max).map(map) : []

// Cleans whatever the editor sends (lengths, counts, allowed icons) and fills
// anything missing from the defaults. Text only — nothing is ever rendered as HTML.
export function sanitizeLanding(input: unknown): LandingContent {
  const d = DEFAULT_LANDING
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, Record<string, unknown> | undefined>
  const hero = i.hero ?? {}, features = i.features ?? {}, how = i.how ?? {}, pricing = i.pricing ?? {}, faq = i.faq ?? {}, cta = i.cta ?? {}

  const out: LandingContent = {
    hero: {
      badge: str(hero.badge, 60, d.hero.badge),
      headline: str(hero.headline, 90, d.hero.headline),
      highlight: str(hero.highlight, 40, d.hero.highlight),
      subtitle: str(hero.subtitle, 300, d.hero.subtitle),
      note: str(hero.note, 80, d.hero.note),
      chips: (Array.isArray(hero.chips) ? hero.chips : d.hero.chips).map(c => str(c, 30)).filter(Boolean).slice(0, 6),
    },
    features: {
      show: features.show !== false,
      title: str(features.title, 100, d.features.title),
      subtitle: str(features.subtitle, 160, d.features.subtitle),
      items: arr(features.items, 12, x => ({
        icon: (ICON_KEYS as string[]).includes(String(x.icon)) ? (x.icon as IconKey) : 'store',
        title: str(x.title, 60), text: str(x.text, 220), badge: str(x.badge, 20),
      })).filter(x => x.title),
    },
    how: {
      show: how.show !== false,
      title: str(how.title, 100, d.how.title),
      steps: arr(how.steps, 4, x => ({ title: str(x.title, 50), text: str(x.text, 200) })).filter(x => x.title),
    },
    pricing: {
      show: pricing.show !== false,
      title: str(pricing.title, 80, d.pricing.title),
      subtitle: str(pricing.subtitle, 160, d.pricing.subtitle),
      plans: arr(pricing.plans, 4, x => ({
        name: str(x.name, 30), price: str(x.price, 30), tag: str(x.tag, 30), cta: str(x.cta, 30, 'Start free'),
        highlight: x.highlight === true,
        features: (Array.isArray(x.features) ? x.features : []).map(f => str(f, 90)).filter(Boolean).slice(0, 12),
      })).filter(x => x.name),
    },
    faq: {
      show: faq.show !== false,
      title: str(faq.title, 80, d.faq.title),
      items: arr(faq.items, 12, x => ({ q: str(x.q, 140), a: str(x.a, 500) })).filter(x => x.q && x.a),
    },
    cta: {
      title: str(cta.title, 90, d.cta.title), text: str(cta.text, 160, d.cta.text),
      storeTitle: str(cta.storeTitle, 90, d.cta.storeTitle), storeText: str(cta.storeText, 160, d.cta.storeText),
    },
  }
  // an empty list falls back to the defaults, so a section can never end up blank by accident
  if (out.features.items.length === 0) out.features.items = d.features.items
  if (out.how.steps.length === 0) out.how.steps = d.how.steps
  if (out.pricing.plans.length === 0) out.pricing.plans = d.pricing.plans
  if (out.faq.items.length === 0) out.faq.items = d.faq.items
  return out
}
