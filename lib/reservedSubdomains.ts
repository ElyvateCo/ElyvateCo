// Subdomains merchants may NOT register — they're either platform
// infrastructure or easy to abuse for phishing ("login.elyvateco.com").
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'console', 'portal', 'panel',
  'auth', 'login', 'signin', 'signup', 'register', 'account', 'accounts',
  'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'ns1', 'ns2', 'mx',
  'support', 'help', 'status', 'docs', 'blog', 'news', 'forum', 'community',
  'cdn', 'static', 'assets', 'img', 'images', 'media', 'files', 'upload',
  'staging', 'stage', 'dev', 'test', 'demo', 'preview', 'beta', 'sandbox',
  'shop', 'store', 'stores', 'checkout', 'pay', 'payment', 'payments', 'billing',
  'bkash', 'nagad', 'nogod', 'rocket', 'upay', 'sslcommerz', 'shopify',
  'elyvate', 'elyvateco', 'official', 'security', 'root', 'system', 'null', 'undefined',
])

export type SubdomainCheck = { ok: true; value: string } | { ok: false; error: string }

// DNS label rules: 3-30 chars, a-z 0-9 and dashes, can't start/end with a dash.
export function validateSubdomain(raw: unknown): SubdomainCheck {
  if (typeof raw !== 'string') return { ok: false, error: 'Store address is required' }
  const v = raw.trim().toLowerCase()
  if (v.length < 3 || v.length > 30) return { ok: false, error: 'Store address must be 3-30 characters' }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(v)) {
    return { ok: false, error: 'Use only letters, numbers and dashes (no dash at the start or end)' }
  }
  if (v.includes('--')) return { ok: false, error: 'Store address cannot contain two dashes in a row' }
  if (RESERVED_SUBDOMAINS.has(v)) return { ok: false, error: 'That address is reserved — please choose another' }
  return { ok: true, value: v }
}
