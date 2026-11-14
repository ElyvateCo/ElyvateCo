import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { parseHttpsUrl, parseUrlList } from '@/lib/mediaLinks'
import { stripProtected } from '@/lib/stripProtected'
import { requireRoom } from '@/lib/plans'

// Photos/videos are LINKS pasted by the merchant — keep only valid https links.
function cleanMedia(body: Record<string, unknown>) {
  if ('images' in body) body.images = parseUrlList(body.images)
  if ('product_videos' in body) body.product_videos = parseUrlList(body.product_videos)
  if ('promo_video_url' in body) body.promo_video_url = parseHttpsUrl(body.promo_video_url)
  return body
}

// Stock count: empty = not tracked (as before); a number = tracked. For a
// tracked product the In stock / Out of stock label follows the number.
// Returns an error message, or null when fine.
function cleanStock(body: Record<string, unknown>): string | null {
  if (!('stock_quantity' in body)) return null
  const v = body.stock_quantity
  if (v === null || v === undefined || v === '') { body.stock_quantity = null; return null }
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n) || n < 0) return 'Stock quantity must be 0 or more'
  body.stock_quantity = Math.min(n, 1_000_000)
  body.stock_status = n > 0 ? 'in_stock' : 'out_of_stock'
  return null
}

// GET — list this store's own products (used by the admin products page)
export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data } = await db.from('products').select('*').eq('store_id', store.id).order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { count } = await db.from('products').select('id', { count: 'exact', head: true }).eq('store_id', store.id)
  const full = await requireRoom(store, 'products_limit', count ?? 0)
  if (full) return full

  const body = cleanMedia(await req.json())
  delete body.id
  const stockError = cleanStock(body)
  if (stockError) return NextResponse.json({ error: stockError }, { status: 400 })
  const { data, error } = await db.from('products').insert({ ...body, store_id: store.id }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...rawRest } = await req.json()
  const rest = stripProtected(cleanMedia(rawRest))
  if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 })

  // Never let store_id be overwritten via the update payload
  delete (rest as Record<string, unknown>).store_id
  const stockError = cleanStock(rest as Record<string, unknown>)
  if (stockError) return NextResponse.json({ error: stockError }, { status: 400 })
  // Customers' purchases change stock behind the editor's back, so a stale
  // edit form must not overwrite the live count: the count is only written
  // when the form explicitly says the merchant changed it.
  if (!(rest as Record<string, unknown>).stock_changed) {
    delete (rest as Record<string, unknown>).stock_quantity
    delete (rest as Record<string, unknown>).stock_status
  }
  delete (rest as Record<string, unknown>).stock_changed

  const db = supabaseAdmin()
  const { data, error } = await db.from('products').update(rest).eq('id', id).eq('store_id', store.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 })

  const db = supabaseAdmin()
  const { error } = await db.from('products').delete().eq('id', id).eq('store_id', store.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
