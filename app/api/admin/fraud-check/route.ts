import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { normalizeBDPhone } from '@/lib/phone'
import { getFeature, limitFor } from '@/lib/plans'
import { hit } from '@/lib/rateLimitDb'
import { lookupPhone, dhakaDayStart, FraudUnavailable } from '@/lib/fraudCheck'

export const dynamic = 'force-dynamic'

// A store owner checks a customer's phone number. Each store has a daily
// limit set by its plan (Plans & features in the main admin panel).
// With no ?phone= it only reports today's usage.
export async function GET(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const feature = await getFeature('fraud_checks_daily')
  if (feature && !feature.enabled) return NextResponse.json({ error: 'Fraud check is not available right now.' }, { status: 403 })

  const { limit } = await limitFor(store, 'fraud_checks_daily')
  const db = supabaseAdmin()
  const { count, error } = await db.from('fraud_checks').select('id', { count: 'exact', head: true }).eq('store_id', store.id).gte('created_at', dhakaDayStart())
  if (error) return NextResponse.json({ error: 'Fraud check is not set up yet.' }, { status: 503 })
  const used = count ?? 0

  const raw = new URL(req.url).searchParams.get('phone')
  if (!raw) return NextResponse.json({ usage: { used, limit } })

  const phone = normalizeBDPhone(raw)
  if (!phone) return NextResponse.json({ error: 'Enter a valid mobile number, like 01712345678', usage: { used, limit } }, { status: 400 })

  if (limit !== null && used >= limit) {
    return NextResponse.json({ error: `You have used all ${limit} fraud checks for today. They reset at midnight, or upgrade your plan for more.`, usage: { used, limit } }, { status: 403 })
  }
  if (!(await hit(`fraud:${store.id}`, 10, 60))) {
    return NextResponse.json({ error: 'Too many checks at once — wait a minute.', usage: { used, limit } }, { status: 429 })
  }

  try {
    const { result, cached } = await lookupPhone(phone)
    await db.from('fraud_checks').insert({ store_id: store.id, phone, live: !cached })
    return NextResponse.json({ result, cached, usage: { used: used + 1, limit } })
  } catch (err) {
    if (err instanceof FraudUnavailable) return NextResponse.json({ error: err.message, usage: { used, limit } }, { status: 503 })
    console.error('Fraud check failed:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Something went wrong. Please try again.', usage: { used, limit } }, { status: 500 })
  }
}
