import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformAdmin } from '@/lib/platformAdmin'
import { normalizeBDPhone } from '@/lib/phone'
import { lookupPhone, FraudUnavailable } from '@/lib/fraudCheck'

export const dynamic = 'force-dynamic'

// The platform owner can check any number — no daily limit (it still counts
// toward the platform's daily cap).
export async function GET(req: NextRequest) {
  if (!(await getPlatformAdmin())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const phone = normalizeBDPhone(new URL(req.url).searchParams.get('phone'))
  if (!phone) return NextResponse.json({ error: 'Enter a valid mobile number, like 01712345678' }, { status: 400 })
  try {
    const { result, cached } = await lookupPhone(phone)
    await supabaseAdmin().from('fraud_checks').insert({ store_id: null, phone, live: !cached })
    return NextResponse.json({ result, cached })
  } catch (err) {
    return NextResponse.json({ error: err instanceof FraudUnavailable ? err.message : 'Something went wrong' }, { status: 503 })
  }
}
