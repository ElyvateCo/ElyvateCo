'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Store, Loader2 } from 'lucide-react'
import { supabaseMerchantBrowser } from '@/lib/supabase-merchant'
import toast from 'react-hot-toast'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'elyvateco.com'

export default function MerchantSignupPage() {
  const [storeName, setStoreName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  // Set when Supabase requires the email to be confirmed before logging in
  const [awaitingEmail, setAwaitingEmail] = useState(false)
  const [resendWait, setResendWait] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (resendWait <= 0) return
    const t = setTimeout(() => setResendWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [resendWait])

  // The email link comes back through /auth/callback, which signs them in
  // and drops them in the onboarding wizard (it finishes creating the store).
  function confirmRedirect() {
    return `${window.location.origin}/auth/callback?next=/onboarding`
  }

  function friendlyAuthError(message: string): string {
    if (/rate limit/i.test(message)) return 'Too many emails were sent. Please wait a few minutes and try again.'
    if (/sending .*email|not authorized|smtp/i.test(message)) {
      return `We couldn't send the verification email right now. (${message})`
    }
    if (/already registered|already been registered/i.test(message)) return 'An account with this email already exists. Please log in instead.'
    return message
  }

  async function resendEmail() {
    const sb = supabaseMerchantBrowser()
    const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: confirmRedirect() } })
    if (error) { toast.error(friendlyAuthError(error.message)); return }
    toast.success('Email sent again')
    setResendWait(60)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = supabaseMerchantBrowser()

    // 1. Make sure the store address is free BEFORE creating the account
    const check = await fetch(`/api/store/check-subdomain?subdomain=${encodeURIComponent(subdomain.trim())}`).then(r => r.json()).catch(() => null)
    // (If the check itself fails, carry on — the server checks again when the store is created)
    if (check && check.available === false) {
      toast.error(check.error || 'That store address is not available')
      setLoading(false)
      return
    }

    // 2. Create the account. The store name/address ride along so they
    //    survive the "confirm your email" step.
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: confirmRedirect(),
        data: { store_name: storeName.trim(), subdomain: (check?.subdomain as string | undefined) ?? subdomain.trim().toLowerCase() },
      },
    })
    if (error || !data.user) {
      toast.error(friendlyAuthError(error?.message || 'Could not create account'))
      setLoading(false)
      return
    }
    // Supabase hides "this email already exists" by returning a user with no identities
    if (data.user.identities && data.user.identities.length === 0) {
      toast.error('An account with this email already exists. Please log in instead.')
      setLoading(false)
      return
    }

    // 3. Email confirmation is ON in Supabase: no session yet. The store is
    //    created in onboarding right after they click the link in the email.
    if (!data.session) {
      setAwaitingEmail(true)
      setResendWait(60)
      setLoading(false)
      return
    }

    const res = await fetch('/api/store/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, subdomain }),
    })
    const result = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(result.error || 'Could not create your store')
      return
    }

    toast.success('Store created!')
    router.push('/onboarding')
    router.refresh()
  }

  // Wired up now — starts working the moment Google is enabled in
  // Supabase → Authentication → Providers (currently left off)
  async function handleGoogle() {
    const sb = supabaseMerchantBrowser()
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
  }

  if (awaitingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 section-pad">
        <div className="card p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Mail size={26} className="text-brand-600" />
          </div>
          <h1 className="font-display text-2xl font-semibold mb-2">Check your email</h1>
          <p className="text-sm text-ink-secondary mb-6">
            We sent a confirmation link to <span className="font-medium text-ink-primary">{email}</span>.
            Open it to finish creating <span className="font-medium text-ink-primary">{storeName}</span>. Check your spam folder too.
          </p>
          <button onClick={resendEmail} disabled={resendWait > 0} className="btn-outline w-full disabled:opacity-60">
            {resendWait > 0 ? `Send again in ${resendWait}s` : 'Send the email again'}
          </button>
          <a href="/login" className="block text-sm text-ink-muted hover:text-brand-600 mt-5">Already confirmed? Log in</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 section-pad">
      <div className="card p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold mb-1">Start your store</h1>
        <p className="text-sm text-ink-secondary mb-6">Create your Elyvate account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Store name</label>
            <div className="relative">
              <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input required className="input pl-11" placeholder="My Shop"
                value={storeName} onChange={e => setStoreName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Subdomain</label>
            <div className="flex items-center">
              <input required className="input rounded-r-none" placeholder="myshop"
                value={subdomain} onChange={e => setSubdomain(e.target.value)} />
              <span className="px-3 py-2.5 bg-surface-100 border border-l-0 border-surface-200 rounded-r-xl text-sm text-ink-muted whitespace-nowrap">
                .{ROOT_DOMAIN}
              </span>
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input required type="email" className="input pl-11" placeholder="you@email.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input required type="password" className="input pl-11" placeholder="••••••••" minLength={6}
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Creating your store...' : 'Create store'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-surface-200 flex-1" />
          <span className="text-xs text-ink-muted">OR</span>
          <div className="h-px bg-surface-200 flex-1" />
        </div>

        <button type="button" onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2 border border-surface-200 rounded-xl py-2.5 text-sm font-medium hover:bg-surface-50 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-sm text-ink-muted text-center mt-6">
          Already have a store?{' '}
          <a href="/login" className="text-brand-600 font-medium">Log in</a>
        </p>
      </div>
    </div>
  )
}
