import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { DEFAULT_FEATURES, type Feature, type Plan } from '@/lib/planDefaults'

const ORDER: Record<Plan, number> = { free: 0, pro: 1, business: 2 }
const PLAN_NAME: Record<Plan, string> = { free: 'Free', pro: 'Pro', business: 'Business' }

type StoreLike = { plan?: string | null; trial_ends_at?: string | null }

let cache: { at: number; rows: Feature[] } | null = null

// Features as set in the main admin panel. Anything not saved there yet uses
// the defaults, so enforcement works even before the database is set up.
export async function loadFeatures(force = false): Promise<Feature[]> {
  if (!force && cache && Date.now() - cache.at < 20_000) return cache.rows
  let rows = DEFAULT_FEATURES
  try {
    const { data, error } = await supabaseAdmin().from('plan_features').select('*')
    if (!error && data) {
      const byKey = new Map((data as Feature[]).map(r => [r.key, r]))
      rows = DEFAULT_FEATURES.map(d => ({ ...d, ...(byKey.get(d.key) ?? {}) }))
    }
  } catch { /* use defaults */ }
  cache = { at: Date.now(), rows }
  return rows
}

export function clearFeatureCache() { cache = null }

// A store on its 14-day trial gets Pro features.
export function effectivePlan(store: StoreLike): Plan {
  const plan = (['free', 'pro', 'business'].includes(String(store.plan)) ? store.plan : 'free') as Plan
  if (plan === 'free' && store.trial_ends_at && new Date(store.trial_ends_at).getTime() > Date.now()) return 'pro'
  return plan
}

export async function getFeature(key: string): Promise<Feature | undefined> {
  return (await loadFeatures()).find(f => f.key === key)
}

// Yes/no features (e.g. custom font).
export async function featureAllowed(store: StoreLike, key: string): Promise<{ allowed: boolean; minPlan: Plan; label: string }> {
  const f = await getFeature(key)
  if (!f) return { allowed: true, minPlan: 'free', label: key }
  const allowed = f.enabled && ORDER[effectivePlan(store)] >= ORDER[f.min_plan]
  return { allowed, minPlan: f.min_plan, label: f.label }
}

// Numeric limits (e.g. products). null = unlimited.
export async function limitFor(store: StoreLike, key: string): Promise<{ limit: number | null; label: string }> {
  const f = await getFeature(key)
  if (!f) return { limit: null, label: key }
  const plan = effectivePlan(store)
  const limit = plan === 'free' ? f.free_limit : plan === 'pro' ? f.pro_limit : f.business_limit
  return { limit, label: f.label }
}

export function lockedResponse(label: string, minPlan: Plan, enabled = true) {
  return NextResponse.json(
    { error: enabled ? `${label} is part of the ${PLAN_NAME[minPlan]} plan. Upgrade to use it.` : `${label} is not available right now.`, code: 'plan' },
    { status: 403 },
  )
}

export function limitResponse(label: string, limit: number, plan: Plan) {
  return NextResponse.json(
    { error: `Your ${PLAN_NAME[plan]} plan allows up to ${limit} ${label.toLowerCase()}. Upgrade to add more.`, code: 'plan' },
    { status: 403 },
  )
}

// One-liner for API routes: returns a 403 response if the feature is locked,
// or null when the store may use it.
export async function requireFeature(store: StoreLike, key: string) {
  const r = await featureAllowed(store, key)
  return r.allowed ? null : lockedResponse(r.label, r.minPlan, (await getFeature(key))?.enabled !== false)
}

// Returns a 403 response if the store is at its limit for `key` (given the
// current count), or null when there is still room.
export async function requireRoom(store: StoreLike, key: string, currentCount: number) {
  const { limit, label } = await limitFor(store, key)
  if (limit !== null && currentCount >= limit) return limitResponse(label, limit, effectivePlan(store))
  return null
}
