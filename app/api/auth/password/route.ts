import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Used by /reset-password (after the email link signed the merchant in).
export async function GET() {
  const { data: { user } } = await supabaseServer().auth.getUser()
  return NextResponse.json({ valid: !!user })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password : ''
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: 'Password must be 8 to 72 characters' }, { status: 400 })

  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 401 })

  const { error } = await sb.auth.updateUser({ password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
