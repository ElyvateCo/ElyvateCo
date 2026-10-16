import { supabaseAdmin } from '@/lib/supabase'
import { DEFAULT_LANDING, sanitizeLanding, type LandingContent } from '@/lib/landingDefaults'

let cache: { at: number; content: LandingContent } | null = null

// The landing page text as saved in the main admin (defaults for anything missing).
export async function loadLanding(force = false): Promise<LandingContent> {
  if (!force && cache && Date.now() - cache.at < 30_000) return cache.content
  let content = DEFAULT_LANDING
  try {
    const { data } = await supabaseAdmin().from('landing_content').select('content').eq('key', 'main').maybeSingle()
    if (data?.content) content = sanitizeLanding(data.content)
  } catch { /* use defaults */ }
  cache = { at: Date.now(), content }
  return content
}

export function clearLandingCache() { cache = null }
