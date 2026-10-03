import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { supabaseAdmin } from './supabase'

export type CurrentStore = {
  id: string
  store_name: string
  subdomain: string
  custom_domain: string | null
  admin_path?: string | null
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
const BASE_COLS = 'id, store_name, subdomain, custom_domain, plan'

// Looks a store up by subdomain or custom domain. admin_path is a newer
// column: if the database migration hasn't been run yet, retry without it so
// the storefront keeps working instead of showing "Store not found".
async function findStore(field: 'subdomain' | 'custom_domain', value: string): Promise<CurrentStore | null> {
  const db = supabaseAdmin()
  const first = await db.from('stores').select(`${BASE_COLS}, admin_path`).eq(field, value).maybeSingle()
  if (!first.error) return (first.data as CurrentStore | null) ?? null
  const second = await db.from('stores').select(BASE_COLS).eq(field, value).maybeSingle()
  return (second.data as CurrentStore | null) ?? null
}

export const getCurrentStore = cache(async (): Promise<CurrentStore | null> => {

  // TEMPORARY preview helper — see middleware.ts. Lets you test any store
  // via ?store=xyz on the shared vercel.app URL, before a real domain
  // with wildcard subdomains is connected.
  const previewSubdomain = headers().get('x-preview-store')
  if (previewSubdomain) {
    // A name that isn't a real store means "no such store" — NEVER quietly
    // fall back to the default store (that hid typos like "ely" vs "elyy"
    // and made it look like products were missing).
    return findStore('subdomain', previewSubdomain)
  }

  const host = getHost()

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

  return subdomain
    ? findStore('subdomain', subdomain)
    : findStore('custom_domain', customDomain!)
})

// For storefront pages: the store, or a 404 if this hostname doesn't
// belong to any store.
export async function requireCurrentStore(): Promise<CurrentStore> {
  const store = await getCurrentStore()
  if (!store) notFound()
  return store
}
