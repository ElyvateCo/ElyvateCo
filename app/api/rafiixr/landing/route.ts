import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin } from '@/lib/platformAdmin'
import { loadLanding, clearLandingCache } from '@/lib/landing'
import { sanitizeLanding } from '@/lib/landingDefaults'

export const dynamic = 'force-dynamic'
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

export async function GET() {
  if (!(await getPlatformAdmin())) return notFound()
  return NextResponse.json(await loadLanding(true))
}

export async function PUT(req: NextRequest) {
  if (!(await getPlatformAdmin())) return notFound()
  const content = sanitizeLanding(await req.json().catch(() => ({})))
  const { error } = await supabaseAdmin().from('landing_content').upsert(
    { key: 'main', content, updated_at: new Date().toISOString() }, { onConflict: 'key' },
  )
  if (error) return NextResponse.json({ error: /landing_content/.test(error.message) ? 'Run supabase-migration-round3.sql first' : error.message }, { status: 500 })
  clearLandingCache()
  return NextResponse.json({ ok: true, content })
}

// Back to the built-in text
export async function DELETE() {
  if (!(await getPlatformAdmin())) return notFound()
  await supabaseAdmin().from('landing_content').delete().eq('key', 'main')
  clearLandingCache()
  return NextResponse.json({ ok: true })
}
