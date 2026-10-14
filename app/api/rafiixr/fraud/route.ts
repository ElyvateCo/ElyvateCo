import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin } from '@/lib/platformAdmin'
import { dhakaDayStart } from '@/lib/fraudCheck'

export const dynamic = 'force-dynamic'

// Fraud-check usage across the whole platform.
export async function GET() {
  if (!(await getPlatformAdmin())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const db = supabaseAdmin()
  const start = dhakaDayStart()
  const cap = Number(process.env.FRAUD_DAILY_CAP) || 900
  const head = { count: 'exact' as const, head: true }

  const [liveToday, totalToday, totalAll, saved, today, stores] = await Promise.all([
    db.from('fraud_checks').select('id', head).eq('live', true).gte('created_at', start),
    db.from('fraud_checks').select('id', head).gte('created_at', start),
    db.from('fraud_checks').select('id', head),
    db.from('fraud_cache').select('phone', head),
    db.from('fraud_checks').select('store_id').gte('created_at', start).not('store_id', 'is', null).limit(20000),
    db.from('stores').select('id, store_name, subdomain, plan'),
  ])
  if (liveToday.error) return NextResponse.json({ error: 'Run supabase-migration-fraud-check.sql first' }, { status: 503 })

  const tally = new Map<string, number>()
  for (const r of today.data ?? []) tally.set(r.store_id, (tally.get(r.store_id) ?? 0) + 1)
  const perStore = (stores.data ?? [])
    .filter(s => tally.has(s.id))
    .map(s => ({ id: s.id, name: s.store_name, subdomain: s.subdomain, plan: s.plan, used: tally.get(s.id) ?? 0 }))
    .sort((a, b) => b.used - a.used)

  return NextResponse.json({
    keyConfigured: !!process.env.FRAUD_API_KEY,
    cap, liveToday: liveToday.count ?? 0, checksToday: totalToday.count ?? 0,
    checksAllTime: totalAll.count ?? 0, savedNumbers: saved.count ?? 0, perStore,
  })
}
