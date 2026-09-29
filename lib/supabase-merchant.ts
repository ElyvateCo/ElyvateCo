'use client'
import { createBrowserClient } from '@supabase/ssr'

// This is deliberately separate from supabaseBrowser() in lib/supabase.ts.
// That one is for CUSTOMERS and keeps its session in localStorage, which
// works fine because customer account pages check auth client-side only.
//
// Merchants are different: middleware.ts has to gate every /admin/* PAGE
// server-side (so a page can never even render for a logged-out visitor).
// Middleware can't read localStorage, so this client stores the merchant's
// session in cookies instead, via @supabase/ssr — the same cookies
// lib/supabase-server.ts reads on the server.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function supabaseMerchantBrowser() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}
