import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getIP } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type StepResult = { step: string; ok: boolean; ms: number; detail?: unknown; error?: string }

// Runs the SAME building blocks "create a store" uses, one at a time, on the
// live site — and reports which one fails or hangs. It creates a throw-away
// test account + store and deletes them again at the end.
//
//   open:  /api/health/selftest?run=yes
async function step(name: string, fn: () => Promise<unknown>, ms = 12000): Promise<StepResult> {
  const t0 = Date.now()
  try {
    const detail = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMED OUT after ${ms / 1000}s — this step never answered`)), ms)),
    ])
    return { step: name, ok: true, ms: Date.now() - t0, detail }
  } catch (err) {
    return { step: name, ok: false, ms: Date.now() - t0, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function GET(req: NextRequest) {
  const version = {
    build: 'server-signup-v3',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 7),
  }

  if (new URL(req.url).searchParams.get('run') !== 'yes') {
    return NextResponse.json({ version, info: 'Open /api/health/selftest?run=yes to run the test (it makes and then deletes a test account).' })
  }
  if (!rateLimit(getIP(req), 'selftest', { max: 6, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ version, error: 'Run limit reached — try again in an hour.' }, { status: 429 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const admin = supabaseAdmin()
  const rand = Math.random().toString(36).slice(2, 8)
  const email = `selftest-${rand}@example.com`
  const password = `Test-${rand}-${Date.now()}`
  const subdomain = `selftest-${rand}`

  const results: StepResult[] = []
  const jar = new Map<string, string>()
  let userId = ''
  let storeId = ''

  results.push(await step('1. database read (stores table)', async () => {
    const { error } = await admin.from('stores').select('id').limit(1)
    if (error) throw new Error(error.message)
    return 'ok'
  }))

  results.push(await step('2. create account (server, admin API)', async () => {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) throw new Error(error?.message || 'no user returned')
    userId = data.user.id
    return 'user created'
  }))

  if (userId) {
    results.push(await step('3. log in — plain Supabase client', async () => {
      const plain = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await plain.auth.signInWithPassword({ email, password })
      if (error || !data.session) throw new Error(error?.message || 'no session returned')
      return 'session received'
    }))

    results.push(await step('4. log in — the way the site does it (cookie session)', async () => {
      const sb = createServerClient(url, anon, {
        cookies: {
          get: (name: string) => jar.get(name),
          set: (name: string, value: string) => { jar.set(name, value) },
          remove: (name: string) => { jar.delete(name) },
        },
      })
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error || !data.session) throw new Error(error?.message || 'no session returned')
      return { cookiesWritten: Array.from(jar.keys()) }
    }))

    results.push(await step('5. read the login back from the cookies', async () => {
      if (jar.size === 0) throw new Error('step 4 wrote no cookies, so there is nothing to read')
      const sb = createServerClient(url, anon, {
        cookies: {
          get: (name: string) => jar.get(name),
          set: () => {},
          remove: () => {},
        },
      })
      const { data, error } = await sb.auth.getUser()
      if (error || !data.user) throw new Error(error?.message || 'no user found in the cookies')
      if (data.user.id !== userId) throw new Error('cookie belongs to a different user')
      return 'session round-trip works'
    }))

    results.push(await step('6. create the store row', async () => {
      let r = await admin.from('stores').insert({ owner_user_id: userId, store_name: 'Self Test', subdomain, admin_path: 'admin' }).select('id').single()
      if (r.error && /admin_path/.test(r.error.message)) {
        r = await admin.from('stores').insert({ owner_user_id: userId, store_name: 'Self Test', subdomain }).select('id').single()
      }
      if (r.error || !r.data) throw new Error(r.error?.message || 'no store returned')
      storeId = r.data.id
      return 'store row created'
    }))

    if (storeId) {
      results.push(await step('7. create hero_section row', async () => {
        const { error } = await admin.from('hero_section').insert({ store_id: storeId, headline: 'Welcome' })
        if (error) throw new Error(error.message)
        return 'ok'
      }))
      results.push(await step('8. create site_settings row', async () => {
        const { error } = await admin.from('site_settings').insert({ store_id: storeId, store_name: 'Self Test' })
        if (error) throw new Error(error.message)
        return 'ok'
      }))
    }
  }

  // Clean up — always
  results.push(await step('9. clean up the test data', async () => {
    if (storeId) {
      await admin.from('hero_section').delete().eq('store_id', storeId)
      await admin.from('site_settings').delete().eq('store_id', storeId)
      await admin.from('stores').delete().eq('id', storeId)
    }
    if (userId) await admin.auth.admin.deleteUser(userId)
    return 'removed'
  }))

  const failed = results.find(r => !r.ok)
  return NextResponse.json({
    version,
    summary: failed ? `FAILED at "${failed.step}": ${failed.error}` : 'ALL STEPS PASSED — creating an account and a store works on the server',
    results,
  })
}
