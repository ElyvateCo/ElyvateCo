import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getIP } from '@/lib/rateLimit'
import { hit } from '@/lib/rateLimitDb'

// Merchant log-in, done on the SERVER. The session goes straight into the
// login cookies (the same ones the admin panel already reads), so logging in
// no longer depends on the browser's Supabase auth client — which can hang.
export async function POST(req: NextRequest) {
  if (!(await hit(`login:ip:${getIP(req)}`, 20, 600))) {
    return NextResponse.json({ error: 'Too many log-in attempts. Please wait a few minutes.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) return NextResponse.json({ error: 'Enter your email and password' }, { status: 400 })
  // Per-account limit too, so guessing one account's password from many addresses is also stopped
  if (!(await hit(`login:email:${email.toLowerCase()}`, 8, 600))) {
    return NextResponse.json({ error: 'Too many log-in attempts for this account. Please wait a few minutes.' }, { status: 429 })
  }

  const { data, error } = await supabaseServer().auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    const message = error?.message === 'Invalid login credentials'
      ? 'Wrong email or password'
      : error?.message || 'Could not log in'
    return NextResponse.json({ error: message }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
