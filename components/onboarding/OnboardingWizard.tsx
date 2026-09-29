'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { THEME_PRESETS } from '@/lib/themePresets'
import { BUSINESS_CATEGORIES } from '@/lib/onboardingOptions'

export type OnboardingInitial = {
  needsStore: boolean
  storeName: string
  subdomain: string | null
  businessCategory: string
  tagline: string
  themePreset: string
  customHex: string
  logoUrl: string
  facebookUrl: string
  instagramUrl: string
}

const STEP_TITLES = ['About your store', 'Look & feel', 'Find you online']
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'elyvate.com'

// Public address of the new store, for the "View my store" button
function buildStoreUrl(subdomain: string): string | null {
  const { protocol, hostname, port } = window.location
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `${protocol}//${subdomain}.localhost${port ? `:${port}` : ''}`
  }
  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) return `https://${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
  return null
}

export default function OnboardingWizard({ initial }: { initial: OnboardingInitial }) {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0-2 = questions, 3 = done
  const [busy, setBusy] = useState(false)

  const [needsStore, setNeedsStore] = useState(initial.needsStore)
  const [subdomain, setSubdomain]   = useState(initial.subdomain ?? '')
  const [storeName, setStoreName]   = useState(initial.storeName)
  const [category, setCategory]     = useState(initial.businessCategory)
  const [tagline, setTagline]       = useState(initial.tagline)
  const [themePreset, setThemePreset] = useState(initial.themePreset)
  const [customHex, setCustomHex]   = useState(initial.customHex)
  const [logoUrl, setLogoUrl]       = useState(initial.logoUrl)
  const [facebookUrl, setFacebookUrl]   = useState(initial.facebookUrl)
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl)

  async function save(fields: Record<string, unknown>): Promise<boolean> {
    const res = await fetch('/api/store/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(data.error || 'Could not save — please try again'); return false }
    return true
  }

  async function next() {
    setBusy(true)
    try {
      if (step === 0) {
        if (!storeName.trim()) { toast.error('Please enter your store name'); return }

        // Merchants who signed in with Google don't have a store yet —
        // create it now, then save the rest.
        if (needsStore) {
          if (!subdomain.trim()) { toast.error('Please choose your store address'); return }
          const res = await fetch('/api/store/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeName, subdomain }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) { toast.error(data.error || 'Could not create your store'); return }
          setSubdomain(data.store.subdomain)
          setNeedsStore(false)
        }
        if (!(await save({ storeName, businessCategory: category, tagline }))) return
      }

      if (step === 1) {
        const fields: Record<string, unknown> = { logoUrl }
        if (themePreset === 'custom') { fields.themePreset = 'custom'; fields.customHex = customHex }
        else fields.themePreset = themePreset
        if (!(await save(fields))) return
      }

      if (step === 2) {
        if (!(await save({ facebookUrl, instagramUrl, completed: true }))) return
      }

      setStep(s => s + 1)
    } finally {
      setBusy(false)
    }
  }

  async function skip() {
    setBusy(true)
    // Skipping still marks setup as finished so they aren't asked again
    const ok = await save({ completed: true })
    setBusy(false)
    if (ok) { router.push('/admin'); router.refresh() }
  }

  // ── Done screen ─────────────────────────────────────────────────────────
  if (step === 3) {
    const storeUrl = subdomain ? buildStoreUrl(subdomain) : null
    return (
      <Shell>
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-5">
            <Check size={32} />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">Your store is ready!</h1>
          <p className="text-sm text-ink-secondary mb-8">
            Next step: add your first product so customers have something to buy.
          </p>
          <div className="space-y-3">
            <button className="btn-primary w-full" onClick={() => { router.push('/admin/products'); router.refresh() }}>
              Add my first product
            </button>
            <button className="btn-outline w-full" onClick={() => { router.push('/admin'); router.refresh() }}>
              Go to dashboard
            </button>
            {storeUrl && (
              <a href={storeUrl} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 text-sm text-brand-600 font-medium pt-2">
                View my store <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  // ── Question steps ──────────────────────────────────────────────────────
  return (
    <Shell>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
          <span>Step {step + 1} of 3</span>
          <span>{STEP_TITLES[step]}</span>
        </div>
        <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold mb-1">Tell us about your store</h1>
            <p className="text-sm text-ink-secondary">You can change all of this later.</p>
          </div>

          <div>
            <label className="label">Store name</label>
            <input className="input" placeholder="My Shop" value={storeName} maxLength={80}
              onChange={e => setStoreName(e.target.value)} />
          </div>

          {needsStore && (
            <div>
              <label className="label">Store address</label>
              <div className="flex items-center">
                <input className="input rounded-r-none" placeholder="myshop" value={subdomain}
                  onChange={e => setSubdomain(e.target.value)} />
                <span className="px-3 py-3 bg-surface-100 border border-l-0 border-surface-300 rounded-r-2xl text-sm text-ink-muted whitespace-nowrap">
                  .{ROOT_DOMAIN}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="label">What do you sell?</label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(category === c ? '' : c)}
                  className={`px-3.5 py-2 rounded-full text-sm border transition ${
                    category === c
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-surface-300 text-ink-secondary hover:border-brand-600'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Short description <span className="text-ink-muted font-normal">(optional)</span></label>
            <textarea className="input resize-none" rows={3} maxLength={160}
              placeholder="One line shown on your homepage, e.g. Handmade bags from Dhaka"
              value={tagline} onChange={e => setTagline(e.target.value)} />
            <p className="text-xs text-ink-muted mt-1 text-right">{tagline.length}/160</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold mb-1">Pick your look</h1>
            <p className="text-sm text-ink-secondary">Choose the main color of your store.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(THEME_PRESETS) as (keyof typeof THEME_PRESETS)[]).map(key => (
              <button key={key} type="button" onClick={() => setThemePreset(key)}
                className={`rounded-2xl border p-3 text-center transition ${
                  themePreset === key ? 'border-brand-600 ring-2 ring-brand-600' : 'border-surface-300'
                }`}>
                <span className="block w-full h-10 rounded-xl mb-2" style={{ backgroundColor: THEME_PRESETS[key].hex }} />
                <span className="text-xs text-ink-secondary">{THEME_PRESETS[key].label}</span>
              </button>
            ))}
            <label className={`rounded-2xl border p-3 text-center cursor-pointer transition ${
              themePreset === 'custom' ? 'border-brand-600 ring-2 ring-brand-600' : 'border-surface-300'
            }`}>
              <input type="color" value={customHex} className="sr-only"
                onChange={e => { setCustomHex(e.target.value.toUpperCase()); setThemePreset('custom') }} />
              <span className="block w-full h-10 rounded-xl mb-2 border border-surface-200"
                style={{ backgroundColor: themePreset === 'custom' ? customHex : undefined,
                         backgroundImage: themePreset === 'custom' ? undefined : 'linear-gradient(135deg,#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa)' }} />
              <span className="text-xs text-ink-secondary">Custom</span>
            </label>
          </div>

          <div>
            <label className="label">Logo link <span className="text-ink-muted font-normal">(optional)</span></label>
            <input className="input" type="url" placeholder="https://…/logo.png" value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)} />
            <p className="text-xs text-ink-muted mt-1">Paste a link to your logo image. You can add it later too.</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold mb-1">Where can customers find you?</h1>
            <p className="text-sm text-ink-secondary">These links appear on your store. Both are optional.</p>
          </div>
          <div>
            <label className="label">Facebook page</label>
            <input className="input" type="url" placeholder="https://facebook.com/yourpage" value={facebookUrl}
              onChange={e => setFacebookUrl(e.target.value)} />
          </div>
          <div>
            <label className="label">Instagram</label>
            <input className="input" type="url" placeholder="https://instagram.com/yourname" value={instagramUrl}
              onChange={e => setInstagramUrl(e.target.value)} />
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3 mt-8">
        {step > 0 && (
          <button type="button" className="btn-secondary !px-4 flex items-center gap-1.5" disabled={busy}
            onClick={() => setStep(s => s - 1)}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button type="button" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={busy} onClick={next}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {step === 2 ? 'Finish' : 'Continue'}
          {!busy && step < 2 && <ArrowRight size={16} />}
        </button>
      </div>

      {/* Can't skip while there's no store yet — a store has to exist first */}
      {!needsStore && (
        <button type="button" onClick={skip} disabled={busy}
          className="block mx-auto mt-5 text-sm text-ink-muted hover:text-ink-primary">
          Skip for now
        </button>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-50 section-pad py-8 sm:py-12 flex flex-col items-center">
      <span className="font-display text-xl font-semibold mb-6">Elyvate</span>
      <div className="card p-6 sm:p-8 w-full max-w-md">{children}</div>
    </div>
  )
}
