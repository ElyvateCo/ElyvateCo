import { supabaseAdmin } from '@/lib/supabase'
import { decryptJson } from '@/lib/secretBox'
import type { GatewayMode } from './bkash'

// Loads + decrypts a store's saved gateway credentials. SERVER ONLY — the
// table has no public access at all; only the service-role key can read it.
export async function loadGatewayCreds<T>(storeId: string, provider: 'bkash' | 'nagad'): Promise<{ creds: T; mode: GatewayMode } | null> {
  const { data } = await supabaseAdmin()
    .from('store_gateway_secrets')
    .select('credentials_encrypted, mode, is_enabled')
    .eq('store_id', storeId)
    .eq('provider', provider)
    .maybeSingle()
  if (!data || !data.is_enabled) return null
  return { creds: decryptJson<T>(data.credentials_encrypted), mode: (data.mode === 'live' ? 'live' : 'sandbox') as GatewayMode }
}
