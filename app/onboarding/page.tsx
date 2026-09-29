import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import OnboardingWizard, { type OnboardingInitial } from '@/components/onboarding/OnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { data: { user } } = await supabaseServer().auth.getUser()
  if (!user) redirect('/login?redirect=/onboarding')

  const store = await getOwnedStore()
  // Already finished setup → straight to the dashboard
  if (store && store.onboarding_completed !== false) redirect('/admin')

  // Load anything already saved so the wizard resumes where they left off
  let settings: Record<string, string | null> | null = null
  let hero: { subheadline: string | null } | null = null
  if (store) {
    const db = supabaseAdmin()
    const [s, h] = await Promise.all([
      db.from('site_settings').select('theme_preset, custom_theme_hex, logo_url, facebook_url, instagram_url').eq('store_id', store.id).maybeSingle(),
      db.from('hero_section').select('subheadline').eq('store_id', store.id).maybeSingle(),
    ])
    settings = s.data
    hero = h.data
  }

  const initial: OnboardingInitial = {
    needsStore: !store,
    storeName: store?.store_name ?? '',
    subdomain: store?.subdomain ?? null,
    businessCategory: store?.business_category ?? '',
    tagline: hero?.subheadline ?? '',
    themePreset: settings?.theme_preset ?? 'indigo',
    customHex: settings?.custom_theme_hex ?? '#4A4DDE',
    logoUrl: settings?.logo_url ?? '',
    facebookUrl: settings?.facebook_url ?? '',
    instagramUrl: settings?.instagram_url ?? '',
  }

  return <OnboardingWizard initial={initial} />
}
