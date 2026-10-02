import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

// Pages whose login session must live in COOKIES (merchant side), so that
// middleware and server components can see it.
const MERCHANT_PATHS = ['/admin', '/onboarding', '/reset-password']

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const rawNext = searchParams.get('next') ?? '/'

  // Only allow redirects to paths on this site (blocks open-redirect tricks
  // like ?next=//evil.com)
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
  const isReset = next.startsWith('/reset-password')

  // The reset email link was opened but Supabase says it's expired/used
  if (isReset && searchParams.get('error')) {
    return NextResponse.redirect(`${origin}/forgot-password?error=expired`)
  }

  // "Reset password" email link that carries a token (works even when the
  // email is opened in a different browser/app than the one that asked).
  // Always lands on /reset-password — never anywhere else.
  if (tokenHash && type === 'recovery') {
    const { error } = await supabaseServer().auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
    if (error) return NextResponse.redirect(`${origin}/forgot-password?error=expired`)
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  if (code) {
    if (MERCHANT_PATHS.some(p => next.startsWith(p))) {
      // Merchant sign-in (e.g. "Continue with Google" on /login) or a
      // password-reset link: the session must land in COOKIES.
      const { error } = await supabaseServer().auth.exchangeCodeForSession(code)
      if (error && isReset) return NextResponse.redirect(`${origin}/forgot-password?error=expired`)
    } else {
      // Customer sign-in — unchanged behaviour
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await sb.auth.exchangeCodeForSession(code)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
