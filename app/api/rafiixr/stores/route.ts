import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin, ownerEmailMap } from '@/lib/platformAdmin'
import { getPublicStoreUrl } from '@/lib/storeUrl'

export const dynamic = 'force-dynamic'
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

// Every store on the platform, with its owner, plan, and activity.
export async function GET() {
  if (!(await getPlatformAdmin())) return notFound()
  const db = supabaseAdmin()

  const [stores, products, orders, emails] = await Promise.all([
    db.from('stores').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('products').select('store_id').limit(50000),
    db.from('orders').select('store_id').limit(50000),
    ownerEmailMap(),
  ])
  const tally = (rows: { store_id: string }[] | null) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r.store_id, (m.get(r.store_id) ?? 0) + 1)
    return m
  }
  const pc = tally(products.data), oc = tally(orders.data)

  return NextResponse.json((stores.data ?? []).map(s => ({
    id: s.id,
    name: s.store_name,
    subdomain: s.subdomain,
    plan: s.plan,
    status: s.status ?? 'active',
    trialEndsAt: s.trial_ends_at ?? null,
    createdAt: s.created_at,
    owner: emails.get(s.owner_user_id) ?? '',
    products: pc.get(s.id) ?? 0,
    orders: oc.get(s.id) ?? 0,
    url: getPublicStoreUrl(s.subdomain),
  })))
}

// Change a store's plan, suspend / reactivate it, or set its trial.
export async function PATCH(req: NextRequest) {
  if (!(await getPlatformAdmin())) return notFound()
  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'Missing store' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.plan !== undefined) {
    if (!['free', 'pro', 'business'].includes(body.plan)) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    update.plan = body.plan
  }
  if (body.status !== undefined) {
    if (!['active', 'suspended'].includes(body.status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
    update.status = body.status
  }
  if (body.trialDays !== undefined) {
    const days = Number(body.trialDays)
    if (!Number.isInteger(days) || days < 0 || days > 365) return NextResponse.json({ error: 'Trial days must be 0 to 365' }, { status: 400 })
    update.trial_ends_at = days === 0 ? null : new Date(Date.now() + days * 86400_000).toISOString()
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })

  const { error } = await supabaseAdmin().from('stores').update(update).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
