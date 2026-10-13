import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { checkLink } from '@/lib/mediaLinks'
import { stripProtected } from '@/lib/stripProtected'
import { requireFeature } from '@/lib/plans'

export async function PUT(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // A merchant can never re-assign this row to another store or change its id
  delete body.store_id
  stripProtected(body)

  // Banner images/videos are pasted LINKS — must be real https links
  for (const [key, label] of [
    ['bg_image', 'Desktop image link'], ['bg_image_mobile', 'Mobile image link'],
    ['bg_video', 'Desktop video link'], ['bg_video_mobile', 'Mobile video link'],
  ] as const) {
    if (key in body) {
      const r = checkLink(body[key], label)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
      body[key] = r.value ?? ''
    }
  }
  const db = supabaseAdmin()

  const { data: existing } = await db.from('hero_section').select('id, bg_video, bg_video_mobile').eq('store_id', store.id).maybeSingle()

  // Plan check: a locked feature can't be newly set (leaving a saved value alone is fine)
  for (const k of ['bg_video', 'bg_video_mobile'] as const) {
    if (typeof body[k] === 'string' && body[k].trim() && body[k] !== existing?.[k]) {
      const locked = await requireFeature(store, 'hero_video')
      if (locked) return locked
      break
    }
  }

  const result = existing?.id
    ? await db.from('hero_section').update(body).eq('id', existing.id).select().single()
    : await db.from('hero_section').insert({ ...body, store_id: store.id }).select().single()

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ data: result.data })
}

// GET — this store's own hero row (used by the admin hero editor)
export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data } = await db.from('hero_section').select('*').eq('store_id', store.id).maybeSingle()
  return NextResponse.json(data)
}
