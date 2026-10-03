import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { secretBoxReady } from '@/lib/secretBox'

export const dynamic = 'force-dynamic'

// Open  /api/health  in a browser to see what is missing — either a Vercel
// environment variable or a Supabase migration. It only ever says
// "ok" / "missing"; it never shows a secret.
const DB_CHECKS: { label: string; table: string; columns: string; fix: string }[] = [
  { label: 'stores.admin_path',               table: 'stores',               columns: 'admin_path',                                   fix: 'run supabase-migration-gateways-delivery-admin.sql' },
  { label: 'orders delivery + gateway columns', table: 'orders',             columns: 'delivery_charge, delivery_zone, gateway_payment_id', fix: 'run supabase-migration-gateways-delivery-admin.sql' },
  { label: 'orders bKash/Nagad columns',      table: 'orders',               columns: 'payment_trx_id, payment_sender_number',        fix: 'run supabase-migration-bd-payments.sql' },
  { label: 'site_settings payment columns',   table: 'site_settings',        columns: 'cod_enabled, bkash_enabled, bkash_number, nagad_enabled, nagad_number', fix: 'run supabase-migration-bd-payments.sql' },
  { label: 'site_settings online-payment flags', table: 'site_settings',     columns: 'bkash_auto_enabled, nagad_auto_enabled',       fix: 'run supabase-migration-gateways-delivery-admin.sql' },
  { label: 'delivery_zones table',            table: 'delivery_zones',       columns: 'id, store_id, charge',                         fix: 'run supabase-migration-gateways-delivery-admin.sql' },
  { label: 'store_gateway_secrets table',     table: 'store_gateway_secrets', columns: 'id, store_id, credentials_encrypted',         fix: 'run supabase-migration-gateways-delivery-admin.sql' },
]

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL:      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:     !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    PAYMENT_SECRET_KEY:            secretBoxReady(),
    RESEND_API_KEY:                !!process.env.RESEND_API_KEY,
    NEXT_PUBLIC_ROOT_DOMAIN:       process.env.NEXT_PUBLIC_ROOT_DOMAIN || '(not set — fine until you connect a domain)',
  }

  const problems: string[] = []
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) problems.push('Supabase URL / anon key missing in Vercel environment variables')
  if (!env.SUPABASE_SERVICE_ROLE_KEY) problems.push('SUPABASE_SERVICE_ROLE_KEY missing in Vercel environment variables')
  if (!env.PAYMENT_SECRET_KEY) problems.push('PAYMENT_SECRET_KEY missing or not 64 hex characters (only needed for automatic bKash/Nagad)')

  const database: Record<string, string> = {}
  if (env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL) {
    const db = supabaseAdmin()
    for (const c of DB_CHECKS) {
      const { error } = await db.from(c.table).select(c.columns).limit(1)
      if (error) {
        database[c.label] = `MISSING — ${c.fix}`
        problems.push(`${c.label}: ${c.fix}`)
      } else {
        database[c.label] = 'ok'
      }
    }
  }

  return NextResponse.json({ ok: problems.length === 0, problems, env, database })
}
