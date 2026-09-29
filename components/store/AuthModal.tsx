'use client'
import { useState } from 'react'
import { X, ShoppingBag, User, ArrowRight, Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Props = {
  onClose: () => void
  onContinueAsGuest: () => void
  onAuthSuccess: () => void
}

type AuthView = 'choose' | 'signin' | 'signup'

export default function AuthModal({ onClose, onContinueAsGuest, onAuthSuccess }: Props) {
  const [view, setView]         = useState<AuthView>('choose')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = supabaseBrowser()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Signed in!')
    onAuthSuccess()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Please enter your name'); return }
    setLoading(true)
    const sb = supabaseBrowser()
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // no email verification
        data: { full_name: name },
      },
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Account created! You\'re signed in.')
    onAuthSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-0 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-surface-100 text-ink-muted hover:text-ink-primary transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* ── CHOOSE VIEW ─────────────────────────────── */}
        {view === 'choose' && (
          <div className="p-8">
            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <ShoppingBag size={26} className="text-brand-600" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-ink-primary text-center mb-2">
              Ready to checkout?
            </h2>
            <p className="text-sm text-ink-secondary text-center mb-8">
              Sign in to track your orders, or continue as a guest.
            </p>

            <div className="space-y-3">
              {/* Sign in option */}
              <button
                onClick={() => setView('signin')}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-ink-primary">Sign in / Create account</p>
                    <p className="text-xs text-ink-secondary">Track orders & save details</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-brand-600 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Guest option */}
              <button
                onClick={onContinueAsGuest}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-surface-300 hover:border-surface-400 hover:bg-surface-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-surface-100 rounded-xl flex items-center justify-center shrink-0">
                    <ShoppingBag size={16} className="text-ink-secondary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-ink-primary">Continue as Guest</p>
                    <p className="text-xs text-ink-secondary">No account needed</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ── SIGN IN VIEW ────────────────────────────── */}
        {view === 'signin' && (
          <div className="p-8">
            <button
              onClick={() => setView('choose')}
              className="text-xs text-ink-muted hover:text-ink-primary mb-5 flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <h2 className="font-display text-2xl font-semibold text-ink-primary mb-1">Sign in</h2>
            <p className="text-sm text-ink-secondary mb-6">
              New here?{' '}
              <button onClick={() => setView('signup')} className="text-brand-600 font-medium hover:underline">
                Create an account
              </button>
            </p>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  required type="email" className="input"
                  placeholder="you@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  required type="password" className="input"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Sign In & Continue
              </button>
            </form>
          </div>
        )}

        {/* ── SIGN UP VIEW ────────────────────────────── */}
        {view === 'signup' && (
          <div className="p-8">
            <button
              onClick={() => setView('signin')}
              className="text-xs text-ink-muted hover:text-ink-primary mb-5 flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <h2 className="font-display text-2xl font-semibold text-ink-primary mb-1">Create account</h2>
            <p className="text-sm text-ink-secondary mb-6">
              Already have one?{' '}
              <button onClick={() => setView('signin')} className="text-brand-600 font-medium hover:underline">
                Sign in
              </button>
            </p>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  required className="input"
                  placeholder="John Doe"
                  value={name} onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  required type="email" className="input"
                  placeholder="you@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  required type="password" className="input"
                  placeholder="Min. 6 characters"
                  minLength={6}
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Create Account & Continue
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
