import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { supabaseAdmin } from './supabase'

export type CurrentStore = {
  id: string
  store_name: string
  subdomain: string
  custom_domain: string | null
  plan: 'free' | 'premium'
}

// Set NEXT_PUBLIC_ROOT_DOMAIN to your platform's domain (e.g. "elyvate.com")
// so "myshop.elyvate.com" resolves to the store with subdomain "myshop".
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase()

// Where the bare root domain / localhost / Vercel preview URLs land until
// the platform landing page exists. Any subdomain that exists in the
// `stores` table can be used here.
const DEFAULT_SUBDOMAIN = (process.env.DEFAULT_STORE_SUBDOMAIN || 'elyvate').toLowerCase()

function getHost(): string {
  const h = headers()
  const raw = h.get('x-forwarded-host') || h.get('host') || ''
  return raw.split(':')[0].toLowerCase()
}

// Works out which store the current storefront request is for, from the
// hostname alone — never from anything the visitor can send in a request
// body. Cached per request so a page with many components only hits the
// database once.
export const getCurrentStore = cache(async (): Promise<CurrentStore | null> => {
  const host = getHost()
  const db = supabaseAdmin()
  const cols = 'id, store_name, subdomain, custom_domain, plan'

  let subdomain: string | null = null
  let customDomain: string | null = null

  const isBareHost =
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    (ROOT_DOMAIN !== '' && (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`))

  if (isBareHost) {
    subdomain = DEFAULT_SUBDOMAIN
  } else if (ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1))
  } else if (host.endsWith('.localhost')) {
    // Local testing: http://myshop.localhost:3000
    subdomain = host.slice(0, -'.localhost'.length)
  } else {
    customDomain = host
  }

  const query = db.from('stores').select(cols)
  const { data } = subdomain
    ? await query.eq('subdomain', subdomain).maybeSingle()
    : await query.eq('custom_domain', customDomain!).maybeSingle()

  return (data as CurrentStore | null) ?? null
})

// For storefront pages: the store, or a 404 if this hostname doesn't
// belong to any store.
export async function requireCurrentStore(): Promise<CurrentStore> {
  const store = await getCurrentStore()
  if (!store) notFound()
  return store
}
