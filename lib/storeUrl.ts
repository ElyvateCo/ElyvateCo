import { headers } from 'next/headers'

// The public address of a store, for "View Store" buttons in the admin panel.
// Real domain connected  -> https://myshop.elyvateco.com
// Local development      -> http://myshop.localhost:3000
// Vercel preview (no domain yet) -> /?store=myshop  (the preview cookie
// in middleware.ts then keeps that store selected while you browse it)
export function getPublicStoreUrl(subdomain: string): string {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase()
  const h = headers()
  const rawHost = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase()
  const host = rawHost.split(':')[0]
  const port = rawHost.includes(':') ? `:${rawHost.split(':')[1]}` : ''
  if (root && (host === root || host.endsWith(`.${root}`))) return `https://${subdomain}.${root}`
  if (host === 'localhost' || host.endsWith('.localhost')) return `http://${subdomain}.localhost${port}`
  return `/?store=${subdomain}`
}
