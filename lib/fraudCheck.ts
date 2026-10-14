import { supabaseAdmin } from '@/lib/supabase'

// Courier delivery history for a Bangladeshi phone number, from the
// Onecodesoft Fraud Checker API. The API key lives in FRAUD_API_KEY (server
// only) and is never sent to a browser.
export type Verdict = 'none' | 'good' | 'warning' | 'risky'

export type CourierResult = {
  id: string; name: string; found: boolean
  total: number; success: number; cancel: number; deliveredPercentage: number
}

export type FraudResult = {
  phone: string; verdict: Verdict; label: string
  total: number; success: number; cancel: number; rate: number | null
  couriers: CourierResult[]
}

export class FraudUnavailable extends Error {}

const COURIER_NAMES: Record<string, string> = {
  steadfast: 'Steadfast', pathao: 'Pathao', redx: 'RedX', carrybee: 'CarryBee', paperfly: 'Paperfly',
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  none: 'No courier history — new customer',
  good: 'Reliable customer',
  warning: 'Be careful',
  risky: 'High risk',
}

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0 }
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

// OUR verdict, from the real counts. (The API itself calls a number with no
// history at all "Risky", which would wrongly scare sellers off new customers.)
export function verdictFor(total: number, success: number, cancel: number): Verdict {
  if (total === 0) return 'none'
  const rate = (success / total) * 100
  if (total >= 2 && rate < 50) return 'risky'
  if (cancel >= 3 && rate < 70) return 'risky'
  if (rate < 80) return 'warning'
  return 'good'
}

export function parseFraudReply(phone: string, raw: unknown): FraudResult | null {
  if (!isObj(raw) || !isObj(raw.response)) return null

  const couriers: CourierResult[] = Object.entries(raw.response).map(([id, v]) => {
    const d = isObj(v) && isObj(v.data) ? v.data : {}
    return {
      id, name: COURIER_NAMES[id] ?? id,
      found: isObj(v) && v.status === true,
      total: num(d.total), success: num(d.success), cancel: num(d.cancel),
      deliveredPercentage: num(d.deliveredPercentage),
    }
  })
  const sum = (k: 'total' | 'success' | 'cancel') => couriers.reduce((a, c) => a + c[k], 0)
  const total = raw.total_parcel !== undefined ? num(raw.total_parcel) : sum('total')
  const success = raw.success_parcel !== undefined ? num(raw.success_parcel) : sum('success')
  const cancel = raw.cancel_parcel !== undefined ? num(raw.cancel_parcel) : sum('cancel')
  const verdict = verdictFor(total, success, cancel)

  return {
    phone, verdict, label: VERDICT_LABEL[verdict], total, success, cancel,
    rate: total > 0 ? Math.round((success / total) * 100) : null,
    couriers,
  }
}

// Start of today in Bangladesh time (UTC+6), as an ISO string
export function dhakaDayStart(): string {
  const d = new Date(Date.now() + 6 * 3600_000)
  d.setUTCHours(0, 0, 0, 0)
  return new Date(d.getTime() - 6 * 3600_000).toISOString()
}

async function callApi(phone: string): Promise<FraudResult> {
  const key = process.env.FRAUD_API_KEY
  if (!key) throw new FraudUnavailable('The fraud check service is not set up yet.')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(
      `https://fraudchecker.ocs-api.top/api/v3?phone=${encodeURIComponent(phone)}&key=${encodeURIComponent(key)}`,
      { cache: 'no-store', signal: ctrl.signal },
    )
    let json: unknown
    try { json = JSON.parse(await res.text()) } catch { throw new FraudUnavailable('The fraud check service sent an unreadable reply.') }
    const parsed = parseFraudReply(phone, json)
    if (!res.ok || !parsed) throw new FraudUnavailable('The fraud check service is unavailable right now. Please try again later.')
    return parsed
  } catch (err) {
    if (err instanceof FraudUnavailable) throw err
    throw new FraudUnavailable('Could not reach the fraud check service.')   // never include the URL: it holds the key
  } finally {
    clearTimeout(timer)
  }
}

// Saved for 24 hours; a live call is only made when there is no fresh copy
// and the platform's daily cap (FRAUD_DAILY_CAP, default 900) is not used up.
export async function lookupPhone(phone: string): Promise<{ result: FraudResult; cached: boolean }> {
  const db = supabaseAdmin()
  const { data } = await db.from('fraud_cache').select('result, checked_at').eq('phone', phone).maybeSingle()
  if (data && Date.now() - new Date(data.checked_at).getTime() < 24 * 3600_000) {
    return { result: data.result as FraudResult, cached: true }
  }

  const cap = Number(process.env.FRAUD_DAILY_CAP) || 900
  const { count } = await db.from('fraud_checks').select('id', { count: 'exact', head: true }).eq('live', true).gte('created_at', dhakaDayStart())
  if ((count ?? 0) >= cap) throw new FraudUnavailable('The fraud check service is busy today. Please try again tomorrow.')

  const result = await callApi(phone)
  await db.from('fraud_cache').upsert({ phone, result, checked_at: new Date().toISOString() })
  return { result, cached: false }
}
