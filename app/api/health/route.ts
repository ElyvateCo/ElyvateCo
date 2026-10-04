import { ROOT_DOMAIN } from '@/lib/rootDomain'
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
    NEXT_PUBLIC_ROOT_DOMAIN:       ROOT_DOMAIN || '(none — fine until you connect your own domain; a vercel.app value is ignored)',
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

  // What Supabase Auth is set to (public endpoint, no secrets)
  const auth: Record<string, string> = {}
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
      cache: 'no-store',
    })
    const a = await r.json()
    auth.signupsAllowed = a.disable_signup ? 'NO — signups are switched off in Supabase' : 'yes'
    auth.emailConfirmationRequired = a.mailer_autoconfirm ? 'no' : 'yes (Supabase\'s own email sender can only reach your team address)'
    if (a.disable_signup) problems.push('Supabase: signups are disabled (Authentication → Sign In / Providers → "Allow new users to sign up")')
  } catch {
    auth.status = 'could not read Supabase Auth settings'
  }
  auth.signupMode = process.env.REQUIRE_EMAIL_CONFIRMATION === 'true'
    ? 'email link required (REQUIRE_EMAIL_CONFIRMATION=true)'
    : 'instant (account is confirmed by the server — no email needed)'

  return NextResponse.json({ ok: problems.length === 0, problems, env, database, auth })
}
