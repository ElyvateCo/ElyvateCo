import { supabaseServer } from '@/lib/supabase-server'
import { ROOT_DOMAIN } from '@/lib/rootDomain'
import { headers } from 'next/headers'

// The platform owner(s): the only accounts that can open the main admin panel
// (/rafiixr). Set PLATFORM_ADMIN_EMAILS in Vercel (comma separated) to change.
const DEFAULT_ADMINS = ['elyvate.shopify.business@gmail.com']

export function platformAdminEmails(): string[] {
  const env = (process.env.PLATFORM_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return env.length ? env : DEFAULT_ADMINS
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  return !!email && platformAdminEmails().includes(email.trim().toLowerCase())
}

// The main admin only exists on the platform's own address (elyvateco.com,
// *.vercel.app, localhost) — never on a store's subdomain or custom domain.
export function onPlatformHost(): boolean {
  const h = headers()
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(':')[0].toLowerCase()
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) return true
  return !!ROOT_DOMAIN && (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`)
}

// Returns the logged-in platform owner, or null for everyone else.
export async function getPlatformAdmin() {
  if (!onPlatformHost()) return null
  const { data: { user } } = await supabaseServer().auth.getUser()
  return user && isPlatformAdminEmail(user.email) ? user : null
}

// user id → email for every account (used to show store owners' emails)
export async function ownerEmailMap(): Promise<Map<string, string>> {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const admin = supabaseAdmin()
  const map = new Map<string, string>()
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users ?? []
    for (const u of users) map.set(u.id, u.email ?? '')
    if (users.length < 1000) break
  }
  return map
}
