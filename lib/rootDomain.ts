// The platform's real root domain, e.g. "elyvateco.com" — the one that gets
// wildcard subdomains (shop.elyvateco.com). Set with NEXT_PUBLIC_ROOT_DOMAIN
// AFTER the domain is bought and connected in Vercel.
//
// A "*.vercel.app" address can NEVER have store subdomains (nobody can add
// wildcard DNS there), so if that is what the variable holds it is ignored
// and the shared-address preview mode (/?store=name) is used instead.
const raw = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .replace(/:\d+$/, '')

export const ROOT_DOMAIN: string = raw.endsWith('.vercel.app') || raw === 'localhost' ? '' : raw
