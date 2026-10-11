import { timingSafeEqual } from 'crypto'

// The /api/health pages describe your setup, so they only answer when the
// secret key from the HEALTH_KEY environment variable is in the link
// (…?key=YOUR_KEY). With no HEALTH_KEY set, they stay switched off.
export function healthKeyOk(req: Request): boolean {
  const expected = process.env.HEALTH_KEY || ''
  const given = new URL(req.url).searchParams.get('key') || ''
  if (expected.length < 12 || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}
