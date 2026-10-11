import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getIP } from '@/lib/rateLimit'
import { hit } from '@/lib/rateLimitDb'
import { getRequestOrigin } from '@/lib/requestOrigin'

// "Forgot password" on the SERVER (the browser auth client crashes inside
// some in-app browsers, e.g. Instagram's). The email link comes back through
// /auth/callback and lands on /reset-password.
export async function POST(req: NextRequest) {
  if (!(await hit(`forgot:ip:${getIP(req)}`, 5, 600))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes and try again.' }, { status: 429 })
  }
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })

  const { error } = await supabaseServer().auth.resetPasswordForEmail(email, {
    redirectTo: `${getRequestOrigin(req)}/auth/callback?next=/reset-password`,
  })
  if (error) {
    const limited = /rate limit/i.test(error.message)
    return NextResponse.json(
      { error: limited ? 'Too many emails were sent. Please wait a few minutes and try again.' : error.message },
      { status: limited ? 429 : 400 },
    )
  }
  return NextResponse.json({ ok: true })
}
