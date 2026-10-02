'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import { supabaseMerchantBrowser } from '@/lib/supabase-merchant'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

function ForgotForm() {
  const params = useSearchParams()
  const linkExpired = params.get('error') === 'expired'
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [wait, setWait]       = useState(0)   // seconds before "send again" unlocks

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function send() {
    setLoading(true)
    const sb = supabaseMerchantBrowser()
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      // The email link comes back here, signs the merchant in with a
      // short-lived "recovery" session, then lands on /reset-password.
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.status === 429
        ? 'Too many requests. Please wait a few minutes and try again.'
        : error.message)
      return
    }
    setSent(true)
    setWait(60)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send()
  }

  return (
    <div className="card p-8 w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold mb-1">Forgot password?</h1>
      <p className="text-sm text-ink-secondary mb-6">
        Enter your account email and we&apos;ll send you a link to choose a new password.
      </p>

      {linkExpired && !sent && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4">
          That reset link is invalid or has expired. Please request a new one.
        </p>
      )}

      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-3">
            If an account exists for <span className="font-medium">{email.trim()}</span>, a reset link is on its way.
            Check your inbox (and spam folder).
          </p>
          <button
            onClick={send}
            disabled={loading || wait > 0}
            className="btn-outline w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {wait > 0 ? `Send again in ${wait}s` : 'Send again'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input required type="email" className="input pl-11" placeholder="you@email.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      <a href="/login" className="flex items-center justify-center gap-1.5 text-sm text-ink-muted hover:text-brand-600 mt-6">
        <ArrowLeft size={14} /> Back to log in
      </a>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 section-pad">
      <Suspense fallback={
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      }>
        <ForgotForm />
      </Suspense>
    </div>
  )
}
