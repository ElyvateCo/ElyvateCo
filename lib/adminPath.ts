// The admin panel's address is chosen by each merchant (stored in
// stores.admin_path) — "yourshop.com/admin" can become
// "yourshop.com/my-secret-panel". It can't clash with a real page of the
// site, so these names are off limits.
export const RESERVED_ADMIN_PATHS = new Set([
  // real pages / folders of the app
  'api', 'auth', 'login', 'signup', 'forgot-password', 'reset-password', 'onboarding',
  'welcome', 'go-admin', 'account', 'cart', 'checkout', 'contact', 'notifications',
  'order-success', 'products', 'track-order', 'wishlist', 'search', 'about',
  'privacy-policy', 'terms', 'returns-policy', 'shipping-policy', 'faq',
  // files / framework
  '_next', 'static', 'public', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json',
  'error', 'not-found', 'sitemap', 'robots',
  // easy to confuse with the storefront or the platform itself
  'store', 'stores', 'shop', 'www', 'app', 'elyvate', 'support', 'help', 'status',
])

export type AdminPathCheck = { ok: true; value: string } | { ok: false; error: string }

export function validateAdminPath(raw: unknown): AdminPathCheck {
  if (typeof raw !== 'string') return { ok: false, error: 'Enter an address for your admin panel' }
  const v = raw.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
  if (v.length < 3 || v.length > 40) return { ok: false, error: 'Use 3 to 40 characters' }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(v)) {
    return { ok: false, error: 'Use only letters, numbers and dashes (no dash at the start or end)' }
  }
  if (RESERVED_ADMIN_PATHS.has(v)) return { ok: false, error: 'That name is used by the site — choose another' }
  return { ok: true, value: v }
}
