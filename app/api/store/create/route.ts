import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateSubdomain } from '@/lib/reservedSubdomains'

export async function POST(req: NextRequest) {
  // Who's asking, verified from their cookie session — never trust a
  // client-supplied user id here, or anyone could create a store owned
  // by someone else's account.
  const sb = supabaseServer()
  const { data: { user }, error: authError } = await sb.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const body = await req.json()
  // No angle brackets: store names end up inside email HTML
  const storeName = typeof body.storeName === 'string' ? body.storeName.replace(/[<>]/g, '').slice(0, 80) : ''
  const subdomain = body.subdomain
  if (!storeName?.trim() || typeof subdomain !== 'string' || !subdomain.trim()) {
    return NextResponse.json({ error: 'Store name and subdomain are required' }, { status: 400 })
  }

  const check = validateSubdomain(subdomain)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
  const cleanSubdomain = check.value

  const admin = supabaseAdmin()

  // One store per account for now — Phase 2 keeps this simple
  const { data: existing } = await admin
    .from('stores')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'You already have a store on this account' }, { status: 400 })
  }

  const { data: store, error: storeError } = await admin
    .from('stores')
    .insert({
      owner_user_id: user.id,
      store_name: storeName.trim(),
      subdomain: cleanSubdomain,
      admin_path: 'admin',
    })
    .select()
    .single()

  if (storeError) {
    const message = storeError.code === '23505'
      ? 'That subdomain is already taken — try another.'
      : storeError.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Every store needs its own hero_section + site_settings row so the
  // storefront and admin panel have something to read from day one.
  await admin.from('hero_section').insert({
    store_id: store.id,
    headline: `Welcome to ${storeName.trim()}`,
  })
  await admin.from('site_settings').insert({
    store_id: store.id,
    store_name: storeName.trim(),
  })

  return NextResponse.json({ store })
}
