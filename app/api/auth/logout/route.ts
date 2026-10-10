import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Merchant log-out on the server: clears the login cookies.
export async function POST() {
  await supabaseServer().auth.signOut()
  return NextResponse.json({ ok: true })
}
