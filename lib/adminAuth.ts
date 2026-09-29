import { NextRequest } from 'next/server'
import { supabaseServer } from './supabase-server'

// Used by every /api/admin/* route. Used to check a single shared password
// cookie — now checks for a real, logged-in merchant session instead.
//
// NOTE: this only confirms SOMEONE is logged in — it does not yet check
// that they own the specific store_id being read/written. That scoping
// gets added in Phase 3 once subdomain-based store detection exists.
// `req` is accepted for backwards compatibility with existing call sites
// but isn't used — the session comes from cookies via supabaseServer().
export async function isAdminAuthed(_req?: NextRequest): Promise<boolean> {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return !!user
}
