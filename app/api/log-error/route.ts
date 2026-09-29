import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  if (!rateLimit(ip, 'error-log', limits.errorLog)) {
    // Fail silently — this is best-effort diagnostics, not something a
    // real visitor should ever see an error about.
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  try {
    const body = await req.json()
    const message    = typeof body.message === 'string' ? body.message.slice(0, 2000) : 'Unknown error'
    const stack       = typeof body.stack === 'string' ? body.stack.slice(0, 5000) : null
    const url         = typeof body.url === 'string' ? body.url.slice(0, 500) : null
    const userAgent   = req.headers.get('user-agent')?.slice(0, 500) ?? null

    const db = supabaseAdmin()
    await db.from('error_logs').insert({ message, stack, url, user_agent: userAgent })

    return NextResponse.json({ ok: true })
  } catch {
    // Never let error-reporting itself throw a visible error
    return NextResponse.json({ ok: false })
  }
}
