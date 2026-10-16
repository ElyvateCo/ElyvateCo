import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin } from '@/lib/platformAdmin'
import { loadTrialSettings, clearPlatformSettingsCache } from '@/lib/platformSettings'

export const dynamic = 'force-dynamic'
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

export async function GET() {
  if (!(await getPlatformAdmin())) return notFound()
  return NextResponse.json({ trial: await loadTrialSettings(true) })
}

// The master free-trial switch: ON gives every store with an active trial Pro
// features and starts a trial for each NEW store; OFF pauses all of it.
export async function PUT(req: NextRequest) {
  if (!(await getPlatformAdmin())) return notFound()
  const body = await req.json().catch(() => ({}))
  const current = await loadTrialSettings(true)
  const days = body.days === undefined ? current.days : Number(body.days)
  if (!Number.isInteger(days) || days < 1 || days > 365) return NextResponse.json({ error: 'Trial length must be 1 to 365 days' }, { status: 400 })
  const enabled = body.enabled === undefined ? current.enabled : body.enabled === true

  const { error } = await supabaseAdmin().from('platform_settings').upsert(
    { key: 'free_trial', value: { enabled, days }, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )
  if (error) {
    return NextResponse.json({ error: /platform_settings/.test(error.message) ? 'Run supabase-migration-round3.sql first' : error.message }, { status: 500 })
  }
  clearPlatformSettingsCache()
  return NextResponse.json({ ok: true, trial: { enabled, days } })
}
