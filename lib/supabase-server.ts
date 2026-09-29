import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use inside Server Components, Route Handlers, and Server Actions.
// Reads the merchant's session from cookies (set by supabaseMerchantBrowser
// on the client — see lib/supabase-merchant.ts).
export function supabaseServer() {
  const cookieStore = cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        try { cookieStore.set({ name, value, ...options }) } catch {
          // Called from a Server Component render — cookies can't be set
          // there. Safe to ignore; middleware refreshes the session instead.
        }
      },
      remove: (name: string, options: CookieOptions) => {
        try { cookieStore.set({ name, value: '', ...options }) } catch {}
      },
    },
  })
}

// Use inside middleware.ts — reads/refreshes the session on the
// request/response pair middleware works with (no next/headers there).
export function supabaseMiddleware(req: NextRequest, res: NextResponse) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        res.cookies.set({ name, value, ...options })
      },
      remove: (name: string, options: CookieOptions) => {
        res.cookies.set({ name, value: '', ...options })
      },
    },
  })
}
