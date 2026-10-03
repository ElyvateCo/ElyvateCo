import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOwnedStore } from '@/lib/ownedStore'
import { encryptJson, decryptJson, secretBoxReady } from '@/lib/secretBox'
import { normalizeBDPhone } from '@/lib/phone'
import { bkashGrantToken, type BkashCreds, type GatewayMode } from '@/lib/gateways/bkash'
import { assertNagadKeys, type NagadCreds } from '@/lib/gateways/nagad'

type Provider = 'bkash' | 'nagad'
const isProvider = (v: unknown): v is Provider => v === 'bkash' || v === 'nagad'
const text = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Merchants connect their OWN bKash / Nagad merchant account here.
// Secrets go in encrypted, and are NEVER sent back to the browser — the
// panel only ever sees "connected" plus a short hint (last characters).
export async function GET() {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ready = secretBoxReady()
  const { data } = await supabaseAdmin()
    .from('store_gateway_secrets')
    .select('provider, mode, is_enabled, credentials_encrypted')
    .eq('store_id', store.id)

  const out: Record<string, { configured: boolean; enabled: boolean; mode: GatewayMode; hint: string }> = {
    bkash: { configured: false, enabled: false, mode: 'sandbox', hint: '' },
    nagad: { configured: false, enabled: false, mode: 'sandbox', hint: '' },
  }
  for (const row of data ?? []) {
    if (!isProvider(row.provider)) continue
    let hint = ''
    if (ready) {
      try {
        if (row.provider === 'bkash') hint = `App key …${decryptJson<BkashCreds>(row.credentials_encrypted).appKey.slice(-4)}`
        else hint = `Merchant ID …${decryptJson<NagadCreds>(row.credentials_encrypted).merchantId.slice(-4)}`
      } catch { hint = 'saved' }
    }
    out[row.provider] = { configured: true, enabled: !!row.is_enabled, mode: row.mode === 'live' ? 'live' : 'sandbox', hint }
  }
  return NextResponse.json({ encryptionReady: ready, ...out })
}

export async function PUT(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!secretBoxReady()) {
    return NextResponse.json({ error: 'Online payments are not switched on for the platform yet (PAYMENT_SECRET_KEY is missing on the server).' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  if (!isProvider(body.provider)) return NextResponse.json({ error: 'Unknown payment provider' }, { status: 400 })
  const provider: Provider = body.provider
  const mode: GatewayMode = body.mode === 'live' ? 'live' : 'sandbox'
  const label = provider === 'bkash' ? 'bKash' : 'Nagad'
  const db = supabaseAdmin()

  let credentialsEncrypted: string | null = null

  if (body.credentials) {
    const c = body.credentials
    try {
      if (provider === 'bkash') {
        const creds: BkashCreds = { username: text(c.username), password: text(c.password), appKey: text(c.appKey), appSecret: text(c.appSecret) }
        if (!creds.username || !creds.password || !creds.appKey || !creds.appSecret) {
          return NextResponse.json({ error: 'Fill in all four bKash fields' }, { status: 400 })
        }
        // Prove the keys work before saving them
        try { await bkashGrantToken(creds, mode) }
        catch { return NextResponse.json({ error: `bKash did not accept these keys in ${mode} mode. Check them and the mode (Sandbox vs Live).` }, { status: 400 }) }
        credentialsEncrypted = encryptJson(creds)
      } else {
        const number = normalizeBDPhone(text(c.merchantNumber))
        const creds: NagadCreds = {
          merchantId: text(c.merchantId),
          merchantNumber: number ?? '',
          merchantPrivateKey: text(c.merchantPrivateKey, 8000),
          pgPublicKey: text(c.pgPublicKey, 8000),
        }
        if (!creds.merchantId || !creds.merchantPrivateKey || !creds.pgPublicKey) {
          return NextResponse.json({ error: 'Fill in the Merchant ID and both keys' }, { status: 400 })
        }
        if (!number) return NextResponse.json({ error: 'Enter your Nagad merchant number, like 01712345678' }, { status: 400 })
        assertNagadKeys(creds)
        credentialsEncrypted = encryptJson(creds)
      }
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : `Could not save the ${label} keys` }, { status: 400 })
    }
  }

  const enabled = body.enabled !== false
  if (credentialsEncrypted) {
    const { error } = await db.from('store_gateway_secrets').upsert(
      { store_id: store.id, provider, mode, is_enabled: enabled, credentials_encrypted: credentialsEncrypted, updated_at: new Date().toISOString() },
      { onConflict: 'store_id,provider' },
    )
    if (error) return NextResponse.json({ error: `Could not save the ${label} keys` }, { status: 500 })
  } else {
    // Only switching on/off or sandbox/live — keys must already be saved
    const { data: row, error } = await db
      .from('store_gateway_secrets')
      .update({ mode, is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('store_id', store.id).eq('provider', provider)
      .select('id')
    if (error || !row || row.length === 0) return NextResponse.json({ error: `Save your ${label} keys first` }, { status: 400 })
  }

  // The checkout reads this public yes/no flag to show the option
  await db.from('site_settings').update({ [`${provider}_auto_enabled`]: enabled }).eq('store_id', store.id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const store = await getOwnedStore()
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const provider = new URL(req.url).searchParams.get('provider')
  if (!isProvider(provider)) return NextResponse.json({ error: 'Unknown payment provider' }, { status: 400 })

  const db = supabaseAdmin()
  await db.from('store_gateway_secrets').delete().eq('store_id', store.id).eq('provider', provider)
  await db.from('site_settings').update({ [`${provider}_auto_enabled`]: false }).eq('store_id', store.id)
  return NextResponse.json({ ok: true })
}
