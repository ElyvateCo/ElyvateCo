// Simple in-memory rate limiter — works on Vercel serverless
// Uses a sliding window approach per IP address

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(store.entries())) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

type RateLimitConfig = {
  windowMs: number  // Time window in milliseconds
  max: number       // Max requests per window
}

export function rateLimit(ip: string, key: string, config: RateLimitConfig): boolean {
  const id    = `${key}:${ip}`
  const now   = Date.now()
  const entry = store.get(id)

  if (!entry || entry.resetAt < now) {
    store.set(id, { count: 1, resetAt: now + config.windowMs })
    return true // allowed
  }

  if (entry.count >= config.max) {
    return false // blocked — too many requests
  }

  entry.count++
  return true // allowed
}

export function getIP(req: Request): string {
  // On Vercel, x-forwarded-for is overwritten at the edge and cannot be
  // spoofed by the client — Vercel explicitly strips any client-supplied
  // value here. x-vercel-forwarded-for is the same trusted value under a
  // more explicit name. We check both for resilience, with no fallback to
  // any client-controllable header.
  const vercelHeader = req.headers.get('x-vercel-forwarded-for')
  const forwarded    = req.headers.get('x-forwarded-for')
  const raw = vercelHeader || forwarded
  const ip  = raw ? raw.split(',')[0].trim() : 'unknown'
  return ip
}

// Pre-configured limiters for different endpoints
export const limits = {
  // Admin login — max 5 attempts per 15 minutes per IP
  adminLogin: { windowMs: 15 * 60 * 1000, max: 5 },
  // Coupon validation — max 10 per minute per IP
  coupon: { windowMs: 60 * 1000, max: 10 },
  // Checkout — max 5 orders per 10 minutes per IP (prevents spam orders)
  checkout: { windowMs: 10 * 60 * 1000, max: 5 },
  // Reviews — max 3 submissions per hour per IP
  review: { windowMs: 60 * 60 * 1000, max: 3 },
  // Contact form — max 3 per hour per IP
  contact: { windowMs: 60 * 60 * 1000, max: 3 },
  // Error reporting — generous since a crashing page could fire this
  // multiple times, but still capped to prevent abuse
  errorLog: { windowMs: 60 * 1000, max: 20 },
  // General API — max 60 per minute per IP
  general: { windowMs: 60 * 1000, max: 60 },
}
