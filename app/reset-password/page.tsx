'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
import { supabaseMerchantBrowser } from '@/lib/supabase-merchant'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

const MIN_LENGTH = 8

export default function ResetPasswordPage() {
  const router = useRouter()
  // null = still checking, true = opened from a valid email link, false = not
  const [validLink, setValidLink] = useState<boolean | null>(null)
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    // /auth/callback already turned the email link into a session (cookie)
    supabaseMerchantBrowser().auth.getUser().then(({ data }) => setValidLink(!!data.user))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_LENGTH) { toast.error(`Password must be at least ${MIN_LENGTH} characters`); return }
    if (password !== confirm) { toast.error('The two passwords do not match'); return }

    setLoading(true)
    const { error } = await supabaseMerchantBrowser().auth.updateUser({ password })
    setLoading(false)
    if (error) { toast.error(error.message); return }

    toast.success('Password updated!')
    window.location.assign('/go-admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 section-pad">
      {validLink === null ? (
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      ) : validLink === false ? (
        <div className="card p-8 w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-semibold mb-2">Link expired</h1>
          <p className="text-sm text-ink-secondary mb-6">
            This reset link is invalid or has already been used. Please request a new one.
          </p>
          <a href="/forgot-password" className="btn-primary w-full inline-block">Request a new link</a>
        </div>
      ) : (
        <div className="card p-8 w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold mb-1">Choose a new password</h1>
          <p className="text-sm text-ink-secondary mb-6">Use at least {MIN_LENGTH} characters.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input required type="password" className="input pl-11" placeholder="••••••••" minLength={MIN_LENGTH}
                  value={password} onChange={e => setPassword(e.target.value)} autoFocus autoComplete="new-password" />
              </div>
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input required type="password" className="input pl-11" placeholder="••••••••" minLength={MIN_LENGTH}
                  value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
