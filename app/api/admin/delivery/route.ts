import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'

// Delivery areas and charges, edited by the merchant (stored in Supabase).
// e.g. "Inside Dhaka" ৳60, "Outside Dhaka" ৳120 — optionally free above an amount.
function clean(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.replace(/[<>]/g, '').trim().slice(0, 60) : ''
  const charge = body.charge === null || body.charge === undefined || body.charge === '' ? NaN : Number(body.charge)
  const freeOverRaw = body.free_over
  const freeOver = freeOverRaw === null || freeOverRaw === '' || freeOverRaw === undefined ? null : Number(freeOverRaw)

  if (!name) return { error: 'Give the delivery area a name' }
  if (!Number.isFinite(charge) || charge < 0 || charge > 100000) return { error: 'Delivery charge must be between 0 and 100000' }
  if (freeOver !== null && (!Number.isFinite(freeOver) || freeOver <= 0 || freeOver > 10000000)) {
    return { error: '"Free delivery over" must be a positive amount (or leave it empty)' }
  }
  return {
    value: {
      name,
      charge: Math.round(charge * 100) / 100,
      free_over: freeOver === null ? null : Math.round(freeOver * 100) / 100,
      is_active: body.is_active !== false,
      sort_order: Number.isInteger(body.sort_order) ? (body.sort_order as number) : 0,
    },
  }
}

export async function GET() {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin()
    .from('delivery_zones').select('*').eq('store_id', store.id)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const c = clean(await req.json().catch(() => ({})))
  if (!c.value) return NextResponse.json({ error: c.error }, { status: 400 })
  const { data, error } = await supabaseAdmin().from('delivery_zones').insert({ ...c.value, store_id: store.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const c = clean(body)
  if (!c.value) return NextResponse.json({ error: c.error }, { status: 400 })
  const { data, error } = await supabaseAdmin().from('delivery_zones').update(c.value).eq('id', body.id).eq('store_id', store.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabaseAdmin().from('delivery_zones').delete().eq('id', id).eq('store_id', store.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
