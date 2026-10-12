import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentStore } from '@/lib/currentStore'
import { getIP } from '@/lib/rateLimit'
import { hit } from '@/lib/rateLimitDb'

// A shopper who signs up or logs in on a store becomes a customer OF THAT
// STORE (and only that store). The browser sends its login token; we check it
// with Supabase, then record the membership. Nothing from the request body is trusted.
export async function POST(req: NextRequest) {
  if (!(await hit(`join:ip:${getIP(req)}`, 60, 3600))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const store = await getCurrentStore()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const { error: upsertError } = await admin.from('store_customers').upsert(
    {
      store_id: store.id,
      user_id: user.id,
      email: user.email ?? null,
      full_name: typeof meta.full_name === 'string' ? meta.full_name.slice(0, 80) : null,
    },
    { onConflict: 'store_id,user_id', ignoreDuplicates: true },
  )
  if (upsertError) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
