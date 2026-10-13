import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin } from '@/lib/platformAdmin'
import { loadFeatures, clearFeatureCache } from '@/lib/plans'
import { DEFAULT_FEATURES } from '@/lib/planDefaults'

export const dynamic = 'force-dynamic'
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

export async function GET() {
  if (!(await getPlatformAdmin())) return notFound()
  return NextResponse.json(await loadFeatures(true))
}

// Turn a feature on/off, choose which plan includes it, or set plan limits.
// Takes effect for every store within seconds.
export async function PUT(req: NextRequest) {
  if (!(await getPlatformAdmin())) return notFound()
  const body = await req.json().catch(() => ({}))
  const base = DEFAULT_FEATURES.find(f => f.key === body.key)
  if (!base) return NextResponse.json({ error: 'Unknown feature' }, { status: 400 })

  const limit = (v: unknown) => {
    if (v === null || v === '' || v === undefined) return null
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 && n <= 10_000_000 ? n : NaN
  }
  const row = {
    ...base,
    enabled: body.enabled !== false,
    min_plan: ['free', 'pro', 'business'].includes(body.min_plan) ? body.min_plan : base.min_plan,
    free_limit: base.kind === 'limit' ? limit(body.free_limit) : null,
    pro_limit: base.kind === 'limit' ? limit(body.pro_limit) : null,
    business_limit: base.kind === 'limit' ? limit(body.business_limit) : null,
  }
  if ([row.free_limit, row.pro_limit, row.business_limit].some(v => typeof v === 'number' && Number.isNaN(v))) {
    return NextResponse.json({ error: 'Limits must be whole numbers (leave empty for unlimited)' }, { status: 400 })
  }

  const { error } = await supabaseAdmin().from('plan_features').upsert(row, { onConflict: 'key' })
  if (error) {
    return NextResponse.json({ error: /plan_features/.test(error.message) ? 'Run supabase-migration-platform-admin.sql first' : error.message }, { status: 500 })
  }
  clearFeatureCache()
  return NextResponse.json({ ok: true })
}
