import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'
import { getCurrentStore } from '@/lib/currentStore'

// Strips HTML/script content — critical since review text is rendered
// to every visitor on the product page. Without this, a malicious
// review could run JavaScript in other customers' browsers (stored XSS).
function sanitize(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLen)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  if (!productId) return NextResponse.json([], { status: 400 })
  const store = await getCurrentStore()
  if (!store) return NextResponse.json([], { status: 404 })
  const db = supabaseAdmin()
  const { data } = await db
    .from('reviews')
    .select('*')
    .eq('store_id', store.id)
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  // Rate limit — max 3 reviews per hour per IP, prevents review spam/flooding
  const ip = getIP(req)
  if (!rateLimit(ip, 'review', limits.review)) {
    return NextResponse.json({ error: 'Too many review submissions. Please try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const productId  = body.productId
    const authorName = sanitize(body.authorName, 60)
    const rating     = parseInt(body.rating)
    const reviewBody = sanitize(body.body, 1000)

    if (!productId || !authorName || !reviewBody || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    const store = await getCurrentStore()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const db = supabaseAdmin()

    // The product must actually belong to THIS store — otherwise someone
    // could attach reviews to another store's products.
    const { data: product } = await db.from('products').select('id').eq('id', productId).eq('store_id', store.id).maybeSingle()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const { data, error } = await db.from('reviews').insert({
      store_id:    store.id,
      product_id:  productId,
      author_name: authorName,
      rating,
      body:        reviewBody,
      is_approved: false, // admin must approve before it's publicly visible
    }).select().single()

    if (error) throw error
    return NextResponse.json({ ok: true, id: data.id })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
