// Admin now lives on each store's own subdomain (myshop.elyvateco.com/admin),
// but signup/login can happen on the root domain. A cookie scoped to
// ".elyvateco.com" makes one login work on every subdomain. On localhost,
// *.vercel.app and merchant custom domains it stays host-only (undefined).
export function cookieDomainFor(host: string | null | undefined): string | undefined {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase()
  if (!root || !host) return undefined
  const h = host.split(':')[0].toLowerCase()
  return h === root || h.endsWith(`.${root}`) ? `.${root}` : undefined
}
