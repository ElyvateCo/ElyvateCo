import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'

function unauth() { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauth()
  const db = supabaseAdmin()
  const { data } = await db.from('reviews').select('*').eq('store_id', store.id).order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauth()
  const { id, is_approved } = await req.json()
  const db = supabaseAdmin()
  await db.from('reviews').update({ is_approved }).eq('id', id).eq('store_id', store.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return unauth()
  const id = new URL(req.url).searchParams.get('id')
  const db = supabaseAdmin()
  await db.from('reviews').delete().eq('id', id!).eq('store_id', store.id)
  return NextResponse.json({ ok: true })
}
