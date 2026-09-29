import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'
import { getCurrentStore } from '@/lib/currentStore'

export async function POST(req: NextRequest) {
  // Rate limit — max 10 attempts per minute per IP, prevents brute-forcing coupon codes
  const ip = getIP(req)
  if (!rateLimit(ip, 'coupon', limits.coupon)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 })
  }

  try {
    const { code, cartTotal } = await req.json()

    if (!code || typeof code !== 'string' || code.length > 30) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    const store = await getCurrentStore()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const db = supabaseAdmin()
    const { data: coupon, error } = await db
      .from('coupons')
      .select('*')
      .eq('store_id', store.id)
      .eq('code', code.trim().toUpperCase())
      .single()

    if (error || !coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 })
    }

    // Check active
    if (!coupon.is_active) {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 })
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })
    }

    // Check usage limit
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 })
    }

    // Check minimum order
    if (coupon.min_order && cartTotal < coupon.min_order) {
      return NextResponse.json({
        error: `Minimum order of $${coupon.min_order.toFixed(2)} required for this coupon`,
      }, { status: 400 })
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.type === 'percentage') {
      discountAmount = parseFloat(((cartTotal * coupon.value) / 100).toFixed(2))
    } else {
      discountAmount = Math.min(coupon.value, cartTotal) // can't discount more than cart total
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      finalTotal: parseFloat((cartTotal - discountAmount).toFixed(2)),
    })
  } catch (err) {
    console.error('Coupon validate error:', err)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
