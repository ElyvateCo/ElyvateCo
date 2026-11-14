import { NextRequest, NextResponse } from 'next/server'
import { hit } from '@/lib/rateLimitDb'
import { supabaseAdmin } from '@/lib/supabase'
import { validateSubdomain } from '@/lib/reservedSubdomains'
import { getIP } from '@/lib/rateLimit'

// Used by the signup form to say "that address is taken" BEFORE the account
// is created (so nobody ends up with an account but no store).
export async function GET(req: NextRequest) {
  if (!(await hit(`check-subdomain:${getIP(req)}`, 30, 60))) {
    return NextResponse.json({ available: false, error: 'Too many checks — please wait a minute.' }, { status: 429 })
  }

  const check = validateSubdomain(new URL(req.url).searchParams.get('subdomain'))
  if (!check.ok) return NextResponse.json({ available: false, error: check.error })

  const { data } = await supabaseAdmin().from('stores').select('id').eq('subdomain', check.value).maybeSingle()
  if (data) return NextResponse.json({ available: false, error: 'That address is already taken — try another.' })

  return NextResponse.json({ available: true, subdomain: check.value })
}
