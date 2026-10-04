import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateSubdomain } from '@/lib/reservedSubdomains'
import { rateLimit, getIP } from '@/lib/rateLimit'

// Creates a merchant account that is ALREADY confirmed, so signing up works
// even before email sending (SMTP) is set up — Supabase's built-in email
// can only reach your own team address.
//
// When you are ready to verify emails (after SMTP works), set
//   REQUIRE_EMAIL_CONFIRMATION=true
// in Vercel and sign-up goes back to the normal "click the link we emailed
// you" flow.
export async function POST(req: NextRequest) {
  if (!rateLimit(getIP(req), 'signup', { max: 10, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ error: 'Too many sign-up attempts. Please try again later.' }, { status: 429 })
  }

  if (process.env.REQUIRE_EMAIL_CONFIRMATION === 'true') {
    return NextResponse.json({ mode: 'confirm' })
  }

  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const storeName = typeof body.storeName === 'string' ? body.storeName.replace(/[<>]/g, '').trim().slice(0, 80) : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: 'Password must be 8 to 72 characters' }, { status: 400 })
  }
  if (!storeName) return NextResponse.json({ error: 'Store name is required' }, { status: 400 })

  const sub = validateSubdomain(body.subdomain)
  if (!sub.ok) return NextResponse.json({ error: sub.error }, { status: 400 })

  const admin = supabaseAdmin()
  const { data: taken } = await admin.from('stores').select('id').eq('subdomain', sub.value).maybeSingle()
  if (taken) return NextResponse.json({ error: 'That store address is already taken — try another.' }, { status: 409 })

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { store_name: storeName, subdomain: sub.value },
  })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return NextResponse.json({ error: 'An account with this email already exists. Please log in instead.' }, { status: 409 })
    }
    console.error('Signup createUser failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ mode: 'created' })
}
