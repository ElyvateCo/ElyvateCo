import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'

// true = allowed, false = too many attempts. Counted in Supabase so the limit
// holds across every Vercel server (needs supabase-migration-security.sql;
// until that is run it falls back to a per-server in-memory limit).
export async function hit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin().rpc('rate_limit_hit', { p_key: key, p_window_seconds: windowSeconds, p_max: max })
    if (!error && typeof data === 'boolean') return data
  } catch { /* fall through */ }
  return rateLimit(key, 'db-fallback', { max, windowMs: windowSeconds * 1000 })
}
