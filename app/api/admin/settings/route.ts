import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'

export async function PUT(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // A merchant can never re-assign this row to another store or change its id
  delete body.store_id
  delete body.id
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
