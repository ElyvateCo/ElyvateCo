import { headers } from 'next/headers'
import { supabaseServer } from './supabase-server'
import { supabaseAdmin } from './supabase'

export type OwnedStore = {
  id: string
  store_name: string
  subdomain: string
  admin_path: string
  custom_domain?: string | null
  plan: 'free' | 'premium'
  business_category?: string | null
  // undefined until the onboarding migration has been run — treat only an
  // explicit `false` as "still needs onboarding"
  onboarding_completed?: boolean
}

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase()

// Admin lives at <subdomain>.elyvateco.com/admin, so an owner must only be
// able to use the admin on THEIR OWN store's host. Platform hosts (root
// domain, localhost, *.vercel.app) are allowed so signup/onboarding and
// previews keep working.
function hostBelongsToStore(store: { subdomain: string; custom_domain?: string | null }): boolean {
  const h = headers()
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(':')[0].toLowerCase()
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) return true
  if (ROOT_DOMAIN && (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`)) return true
  if (ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) return host.slice(0, -(ROOT_DOMAIN.length + 1)) === store.subdomain
  if (host.endsWith('.localhost')) return host.slice(0, -'.localhost'.length) === store.subdomain
  return !!store.custom_domain && store.custom_domain.toLowerCase() === host
}

// Returns the store the currently logged-in merchant owns, or null if
// they're not logged in or don't have a store yet. Every /api/admin/*
// route uses this — instead of just checking "is anyone logged in" — so a
// merchant can only ever read/write their OWN store's data, never
// another merchant's, no matter what id they pass in a request.
export async function getOwnedStore(): Promise<OwnedStore | null> {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null

  const admin = supabaseAdmin()
  const { data: store } = await admin
    .from('stores')
    .select('*')
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!store || !hostBelongsToStore(store)) return null
  return store
}
