import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { BUSINESS_CATEGORIES } from '@/lib/onboardingOptions'
import { isThemePresetKey, isValidHex } from '@/lib/themePresets'

// Names/taglines end up inside emails and pages — no angle brackets.
function cleanText(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/[<>]/g, '').trim().slice(0, max) : ''
}

// Only real http(s) links — blocks javascript: and similar in logo/social URLs.
function parseUrl(v: unknown): { ok: true; value: string | null } | { ok: false } {
  if (typeof v !== 'string') return { ok: false }
  const t = v.trim()
  if (!t) return { ok: true, value: null }
  try {
    const u = new URL(t)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false }
    return { ok: true, value: u.toString() }
  } catch {
    return { ok: false }
  }
}

// Saves whatever subset of onboarding fields the wizard sends for the
// current step, so progress is kept in Supabase even if the merchant
// closes the page halfway and comes back later.
export async function POST(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const storeUpdates: Record<string, unknown> = {}
  const settingsUpdates: Record<string, unknown> = {}
  const heroUpdates: Record<string, unknown> = {}

  if ('storeName' in body) {
    const name = cleanText(body.storeName, 80)
    if (!name) return NextResponse.json({ error: 'Store name is required' }, { status: 400 })
    storeUpdates.store_name = name
    settingsUpdates.store_name = name
  }

  if ('businessCategory' in body) {
    const c = body.businessCategory
    if (c && !(BUSINESS_CATEGORIES as readonly string[]).includes(c)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    storeUpdates.business_category = c || null
  }

  if ('tagline' in body) {
    heroUpdates.subheadline = cleanText(body.tagline, 160)
  }

  if ('themePreset' in body) {
    if (isThemePresetKey(body.themePreset)) {
      settingsUpdates.theme_preset = body.themePreset
    } else if (body.themePreset === 'custom' && isValidHex(body.customHex)) {
      settingsUpdates.theme_preset = 'custom'
      settingsUpdates.custom_theme_hex = body.customHex
    } else {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 })
    }
  }

  for (const [key, column, label] of [
    ['logoUrl', 'logo_url', 'Logo link'],
    ['facebookUrl', 'facebook_url', 'Facebook link'],
    ['instagramUrl', 'instagram_url', 'Instagram link'],
  ] as const) {
    if (key in body) {
      const r = parseUrl(body[key])
      if (!r.ok) return NextResponse.json({ error: `${label} must start with http:// or https://` }, { status: 400 })
      settingsUpdates[column] = r.value
    }
  }

  if (body.completed === true) storeUpdates.onboarding_completed = true

  const db = supabaseAdmin()
  const jobs: PromiseLike<{ error: { message: string } | null }>[] = []
  if (Object.keys(storeUpdates).length)    jobs.push(db.from('stores').update(storeUpdates).eq('id', store.id))
  if (Object.keys(settingsUpdates).length) jobs.push(db.from('site_settings').update(settingsUpdates).eq('store_id', store.id))
  if (Object.keys(heroUpdates).length)     jobs.push(db.from('hero_section').update(heroUpdates).eq('store_id', store.id))

  const results = await Promise.all(jobs)
  const failed = results.find(r => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
