import { NextRequest, NextResponse } from 'next/server'
import { supabaseMiddleware } from '@/lib/supabase-server'

// The bare platform address (root domain, localhost, Vercel preview URLs)
// shows the Elyvate landing page. Store subdomains and custom domains
// (myshop.elyvate.com, myshop.localhost, shop.theirdomain.com) show stores.
function isPlatformHost(req: NextRequest): boolean {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase()
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase()
  return (
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    (root !== '' && (host === root || host === `www.${root}`))
  )
}

export async function middleware(req: NextRequest) {

  // ── FIX: CVE-2025-29927 ─────────────────────────────────────────────────
  // Attackers can bypass all middleware auth by adding this header to any
  // request, tricking Next.js into thinking middleware already ran.
  // We hard-block any request that contains this header from external sources.
  if (req.headers.get('x-middleware-subrequest')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { pathname, searchParams } = req.nextUrl

  // TEMPORARY preview helper: until a real domain is connected, Vercel's
  // shared *.vercel.app address can't do real subdomains at all — DNS for
  // "ely.yoursite.vercel.app" simply doesn't exist. Visiting
  // "yoursite.vercel.app/?store=ely" previews that store's public pages
  // instead. Only honored on the shared/platform host — a merchant's own
  // connected domain always shows their real store, ignoring this.
  //
  // The ?store= value is remembered in a cookie, so clicking around inside
  // the previewed store (/products, /cart, /checkout...) keeps showing that
  // store instead of dropping back to the default one. Use ?store=off to
  // clear it and see the platform landing page again.
  const PREVIEW_COOKIE = 'elyvate_preview_store'
  const onPlatformHost = isPlatformHost(req)
  const rawParam = (searchParams.get('store') || '').trim().toLowerCase()
  const clearPreview = onPlatformHost && rawParam === 'off'
  const paramStore = onPlatformHost && /^[a-z0-9-]{1,30}$/.test(rawParam) && rawParam !== 'off' ? rawParam : null
  const cookieStore = onPlatformHost && !clearPreview ? (req.cookies.get(PREVIEW_COOKIE)?.value || '') : ''
  const previewStore = paramStore || (/^[a-z0-9-]{1,30}$/.test(cookieStore) ? cookieStore : null)
  const requestHeaders = new Headers(req.headers)
  if (previewStore) requestHeaders.set('x-preview-store', previewStore)

  let res = NextResponse.next({ request: { headers: requestHeaders } })

  // Home page of the platform itself → landing page (URL stays "/")
  // — unless a preview store was requested, then let it show that store.
  if (pathname === '/' && isPlatformHost(req) && !previewStore) {
    const url = req.nextUrl.clone()
    url.pathname = '/welcome'
    res = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  if (paramStore) {
    res.cookies.set(PREVIEW_COOKIE, paramStore, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 })
  } else if (clearPreview) {
    res.cookies.set(PREVIEW_COOKIE, '', { path: '/', maxAge: 0 })
  }

  // ── Admin panel page gate ───────────────────────────────────────────────
  // Every /admin/* PAGE needs a real, logged-in merchant session — checked
  // via Supabase Auth (cookie-based). This replaced the old single shared
  // ADMIN_SECRET password. This is the actual thing standing between a
  // random visitor and the admin panel — without it, a page that fetches
  // its own data directly (like the dashboard) would render for anyone who
  // just knows the URL, regardless of what any individual API route checks.
  if (pathname.startsWith('/admin') || pathname === '/onboarding') {
    const sb = supabaseMiddleware(req, res)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Security Headers ────────────────────────────────────────────────────
  // These headers protect against a wide range of common web attacks.

  // Prevent clickjacking — nobody can embed your site in an iframe
  res.headers.set('X-Frame-Options', 'DENY')

  // Force HTTPS — browsers must only connect over HTTPS after first visit
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // Prevent MIME type sniffing — browser must respect Content-Type
  res.headers.set('X-Content-Type-Options', 'nosniff')

  // Stop browsers sending Referer header to external sites
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Disable dangerous browser features
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // Content Security Policy — controls where resources can load from
  // Protects against XSS, data injection, and malicious script injection
  res.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Merchants paste font links from any host, so https: is allowed
    "font-src 'self' data: https:",
    // Merchants paste photo links from any host (imgbb, Imgur, Cloudinary...)
    "img-src 'self' data: blob: https:",
    // Hero/product videos can be any admin-pasted HTTPS URL (a CDN, etc.),
    // so media-src must allow https: broadly rather than just Supabase —
    // otherwise pasted video links get silently blocked by the browser.
    "media-src 'self' blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.resend.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '))

  return res
}

export const config = {
  matcher: [
    // Apply to all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
