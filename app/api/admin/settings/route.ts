import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { checkLink } from '@/lib/mediaLinks'
import { normalizeBDPhone } from '@/lib/phone'

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

  // bKash / Nagad receiving numbers: must be real Bangladeshi mobile numbers,
  // and a wallet can't be switched on without one.
  for (const [on, num, type, label] of [
    ['bkash_enabled', 'bkash_number', 'bkash_type', 'bKash'],
    ['nagad_enabled', 'nagad_number', 'nagad_type', 'Nagad'],
  ] as const) {
    if (num in body) {
      const raw = typeof body[num] === 'string' ? body[num].trim() : ''
      const clean = raw ? normalizeBDPhone(raw) : null
      if (raw && !clean) {
        return NextResponse.json({ error: `${label} number must be a valid Bangladeshi mobile number, like 01712345678` }, { status: 400 })
      }
      body[num] = clean
    }
    if (type in body && !['personal', 'agent', 'merchant'].includes(body[type])) body[type] = 'personal'
    if (body[on] === true && !body[num]) {
      return NextResponse.json({ error: `Add your ${label} number before turning ${label} on` }, { status: 400 })
    }
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
