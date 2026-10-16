import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin } from '@/lib/platformAdmin'
import { parseHttpsUrl } from '@/lib/mediaLinks'

export const dynamic = 'force-dynamic'
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })
const noTable = (m: string) => NextResponse.json({ error: /video_templates/.test(m) ? 'Run supabase-migration-video-templates.sql first' : m }, { status: 500 })

// The ready-made background videos merchants can pick (you add them here).
export async function GET() {
  if (!(await getPlatformAdmin())) return notFound()
  const { data, error } = await supabaseAdmin().from('video_templates').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) return noTable(error.message)
  return NextResponse.json(data ?? [])
}

function clean(body: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {}
  if (!partial || body.title !== undefined) {
    const t = typeof body.title === 'string' ? body.title.replace(/[<>]/g, '').trim().slice(0, 60) : ''
    if (!t) return { error: 'Give the video a title' }
    out.title = t
  }
  if (!partial || body.video_url !== undefined) {
    const u = parseHttpsUrl(body.video_url)
    if (!u) return { error: 'The video link must start with https://' }
    out.video_url = u
  }
  if (body.thumbnail_url !== undefined) {
    if (body.thumbnail_url === null || body.thumbnail_url === '') out.thumbnail_url = null
    else {
      const th = parseHttpsUrl(body.thumbnail_url)
      if (!th) return { error: 'The preview picture link must start with https://' }
      out.thumbnail_url = th
    }
  }
  if (body.is_active !== undefined) out.is_active = body.is_active === true
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order)
    if (!Number.isInteger(n) || n < 0 || n > 100000) return { error: 'Bad order number' }
    out.sort_order = n
  }
  return { value: out }
}

export async function POST(req: NextRequest) {
  if (!(await getPlatformAdmin())) return notFound()
  const c = clean(await req.json().catch(() => ({})), false)
  if (!c.value) return NextResponse.json({ error: c.error }, { status: 400 })
  const db = supabaseAdmin()
  const { count } = await db.from('video_templates').select('id', { count: 'exact', head: true })
  const { data, error } = await db.from('video_templates').insert({ sort_order: (count ?? 0) + 1, ...c.value }).select().single()
  if (error) return noTable(error.message)
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  if (!(await getPlatformAdmin())) return notFound()
  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing video' }, { status: 400 })
  const c = clean(body, true)
  if (!c.value) return NextResponse.json({ error: c.error }, { status: 400 })
  const { error } = await supabaseAdmin().from('video_templates').update(c.value).eq('id', body.id)
  if (error) return noTable(error.message)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await getPlatformAdmin())) return notFound()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing video' }, { status: 400 })
  const { error } = await supabaseAdmin().from('video_templates').delete().eq('id', id)
  if (error) return noTable(error.message)
  return NextResponse.json({ ok: true })
}
