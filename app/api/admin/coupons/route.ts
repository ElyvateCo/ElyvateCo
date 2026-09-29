import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// GET — list this store's coupons
export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauthorized()

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('coupons')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create coupon
export async function POST(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauthorized()

  try {
    const body = await req.json()
    const { code, type, value, min_order, usage_limit, expires_at, is_active } = body

    if (!code || !type || !value) {
      return NextResponse.json({ error: 'Code, type and value are required' }, { status: 400 })
    }
    if (!['percentage', 'fixed'].includes(type)) {
      return NextResponse.json({ error: 'Type must be percentage or fixed' }, { status: 400 })
    }
    if (type === 'percentage' && (value <= 0 || value > 100)) {
      return NextResponse.json({ error: 'Percentage must be between 1 and 100' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('coupons')
      .insert({
        store_id: store.id,
        code: code.trim().toUpperCase(),
        type,
        value: parseFloat(value),
        min_order: min_order ? parseFloat(min_order) : 0,
        usage_limit: usage_limit ? parseInt(usage_limit) : null,
        expires_at: expires_at || null,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Create coupon error:', err)
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 })
  }
}

// PATCH — toggle active or update (only this store's own coupon)
export async function PATCH(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauthorized()

  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    delete (updates as Record<string, unknown>).store_id

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .eq('store_id', store.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('Update coupon error:', err)
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 })
  }
}

// DELETE — remove coupon (only this store's own)
export async function DELETE(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauthorized()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const db = supabaseAdmin()
  const { error } = await db.from('coupons').delete().eq('id', id).eq('store_id', store.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
