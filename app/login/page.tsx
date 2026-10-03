'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { supabaseMerchantBrowser } from '@/lib/supabase-merchant'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const rawRedirect = params.get('redirect') || '/go-admin'
  // Only ever redirect to a path on this site
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/go-admin'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = supabaseMerchantBrowser()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    window.location.assign(redirect)
  }

  // Wired up now — starts working the moment Google is enabled in
  // Supabase → Authentication → Providers (currently left off)
  async function handleGoogle() {
    const sb = supabaseMerchantBrowser()
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
    })
  }

  return (
    <div className="card p-8 w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold mb-1">Log in</h1>
      <p className="text-sm text-ink-secondary mb-6">Welcome back to your store.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input required type="email" className="input pl-11" placeholder="you@email.com"
              value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input required type="password" className="input pl-11" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="text-right mt-1.5">
            <a href="/forgot-password" className="text-xs text-brand-600 font-medium">Forgot password?</a>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Logging in...' : 'Log In'}
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
        Don&apos;t have a store yet?{' '}
        <a href="/signup" className="text-brand-600 font-medium">Sign up</a>
      </p>
    </div>
  )
}

export default function MerchantLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 section-pad">
      <Suspense fallback={
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
