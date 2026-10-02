import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { checkLink } from '@/lib/mediaLinks'

export async function PUT(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // A merchant can never re-assign this row to another store or change its id
  delete body.store_id
  delete body.id

  // Logo and custom font are pasted LINKS. The font link is written into a
  // <style> tag on the storefront, so it gets the strict "CSS-safe" check.
  if ('logo_url' in body) {
    const r = checkLink(body.logo_url, 'Logo link')
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
    body.logo_url = r.value
  }
  if ('custom_font_url' in body) {
    const r = checkLink(body.custom_font_url, 'Font link', { cssSafe: true })
    if (!r.ok) return NextResponse.json({ error: r.error + ' (no spaces, quotes or brackets)' }, { status: 400 })
    body.custom_font_url = r.value
    if (!r.value) body.custom_font_name = null
  }
  const db = supabaseAdmin()

  const { data: existing } = await db.from('site_settings').select('id').eq('store_id', store.id).maybeSingle()

  const result = existing?.id
    ? await db.from('site_settings').update(body).eq('id', existing.id).select().single()
    : await db.from('site_settings').insert({ ...body, store_id: store.id }).select().single()

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ data: result.data })
}

// GET — this store's own settings row (used by the admin settings page)
export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data } = await db.from('site_settings').select('*').eq('store_id', store.id).maybeSingle()
  return NextResponse.json(data)
}
