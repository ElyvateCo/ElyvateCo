import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { checkLink } from '@/lib/mediaLinks'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// GET — list this store's categories, ordered for display
export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauthorized()

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create category
export async function POST(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauthorized()

  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const img = checkLink(body.image_url, 'Image link')
    if (!img.ok) return NextResponse.json({ error: img.error }, { status: 400 })

    const slug = slugify(name)
    if (!slug) return NextResponse.json({ error: 'Name must contain at least one letter or number' }, { status: 400 })

    const db = supabaseAdmin()

    // Figure out the next display_order (within THIS store) so new
    // categories land at the end of this merchant's own list
    const { data: existing } = await db.from('categories').select('display_order').eq('store_id', store.id).order('display_order', { ascending: false }).limit(1)
    const nextOrder = (existing?.[0]?.display_order ?? -1) + 1

    const { data, error } = await db
      .from('categories')
      .insert({
        store_id: store.id,
        name,
        slug,
        image_url: img.value ?? '',
        display_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Create category error:', err)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

// DELETE — remove category (only if it belongs to this merchant's store)
export async function DELETE(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauthorized()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const db = supabaseAdmin()
  const { error } = await db.from('categories').delete().eq('id', id).eq('store_id', store.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
