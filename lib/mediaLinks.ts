// Merchants don't upload files on Elyvate — they paste LINKS to their photos
// and videos (imgbb, Imgur, Cloudinary, Google Photos "copy image address",
// their own hosting, etc.). Everything a merchant pastes goes through here,
// on the client (to give instant feedback) AND on the server (never trust
// the browser).

// A normal https:// link, normalised. Plain http:// is refused because the
// store is served over HTTPS, so browsers would block http media anyway.
export function parseHttpsUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t || t.length > 2000) return null
  try {
    const u = new URL(t)
    if (u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

export function isHttpsUrl(v: unknown): boolean {
  return parseHttpsUrl(v) !== null
}

// Accepts an array or a pasted block (one link per line / space separated).
// Invalid entries are dropped, duplicates removed.
export function parseUrlList(v: unknown, max = 20): string[] {
  const raw: unknown[] = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\s+/) : []
  const out: string[] = []
  for (const item of raw) {
    const url = parseHttpsUrl(item)
    if (url && !out.includes(url)) out.push(url)
    if (out.length >= max) break
  }
  return out
}

// Stricter version for places where the link is written into a <style> tag
// (custom fonts). Quotes, brackets, backslashes or spaces could break out of
// the CSS url('...') and inject code into the store's pages — so any link
// containing them is refused outright.
export function parseCssSafeUrl(v: unknown): string | null {
  const url = parseHttpsUrl(v)
  if (!url) return null
  return /['"()<>\\\s]/.test(url) ? null : url
}

type LinkResult = { ok: true; value: string | null } | { ok: false; error: string }

// For API routes: empty -> null (clears the field); non-empty but invalid -> error.
export function checkLink(v: unknown, label: string, opts?: { cssSafe?: boolean }): LinkResult {
  if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return { ok: true, value: null }
  const parsed = opts?.cssSafe ? parseCssSafeUrl(v) : parseHttpsUrl(v)
  if (!parsed) return { ok: false, error: `${label} must be a full link starting with https://` }
  return { ok: true, value: parsed }
}
