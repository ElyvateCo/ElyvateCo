import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'
import { getCurrentStore } from '@/lib/currentStore'

export async function GET(req: NextRequest) {
  // Rate limit — prevents brute-forcing order IDs to find other customers' data
  const ip = getIP(req)
  if (!rateLimit(ip, 'track-order', limits.general)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')?.trim().slice(0, 40)
  const email = searchParams.get('email')?.trim().toLowerCase().slice(0, 150)

  if (!id || !email) return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })

  // Escape SQL LIKE wildcard characters (% and _) in user input before using
  // ilike. Without this, a request like ?email=%25&id=%25 would match ANY
  // customer's order (since % is a wildcard), leaking other people's name,
  // address, phone, and order status. Postgres uses \ as the LIKE escape
  // character by default.
  const escapeLike = (s: string) => s.replace(/[\\%_]/g, ch => `\\${ch}`)
  const safeId    = escapeLike(id)
  const safeEmail = escapeLike(email)

  const store = await getCurrentStore()
  if (!store) return NextResponse.json({ order: null }, { status: 404 })

  const db = supabaseAdmin()

  // Try full UUID first, then short ID prefix match
  let query = db.from('orders').select(
    'id,customer_name,product_name,quantity,total_price,order_status,payment_status,tracking_number,tracking_carrier,created_at,fulfilled_at,customer_address,customer_city,customer_country,customer_zip'
  ).eq('store_id', store.id).ilike('customer_email', safeEmail)

  // If looks like short ID (8 chars), search by prefix
  const isShortId = id.length <= 8
  const { data, error } = isShortId
    ? await query.ilike('id', `${safeId}%`)
    : await query.eq('id', id)

  if (error || !data || data.length === 0) {
    return NextResponse.json({ order: null }, { status: 404 })
  }

  return NextResponse.json({ order: data[0] })
}
