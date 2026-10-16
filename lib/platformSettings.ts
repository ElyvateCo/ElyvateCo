import { supabaseAdmin } from '@/lib/supabase'

// Platform-wide switches, edited in the main admin (/rafiixr).
export type TrialSettings = { enabled: boolean; days: number }

const DEFAULT_TRIAL: TrialSettings = { enabled: false, days: 14 }   // the trial starts OFF
let cache: { at: number; trial: TrialSettings } | null = null

export async function loadTrialSettings(force = false): Promise<TrialSettings> {
  if (!force && cache && Date.now() - cache.at < 15_000) return cache.trial
  let trial = DEFAULT_TRIAL
  try {
    const { data } = await supabaseAdmin().from('platform_settings').select('value').eq('key', 'free_trial').maybeSingle()
    const v = data?.value as { enabled?: unknown; days?: unknown } | undefined
    if (v) {
      const days = Number(v.days)
      trial = { enabled: v.enabled === true, days: Number.isInteger(days) && days >= 1 && days <= 365 ? days : 14 }
    }
  } catch { /* use defaults */ }
  cache = { at: Date.now(), trial }
  return trial
}

export function clearPlatformSettingsCache() { cache = null }
