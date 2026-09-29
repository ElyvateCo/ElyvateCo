import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'

  // Only allow redirects to paths on this site (blocks open-redirect tricks
  // like ?next=//evil.com)
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    if (next.startsWith('/admin') || next.startsWith('/onboarding')) {
      // Merchant sign-in (e.g. "Continue with Google" on /login): the
      // session must land in COOKIES so middleware can see it.
      await supabaseServer().auth.exchangeCodeForSession(code)
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
