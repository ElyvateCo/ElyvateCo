'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase'
import { useAuth } from '@/lib/authContext'
import toast from 'react-hot-toast'

type View = 'signin' | 'signup'

export default function LoginPage() {
  const [view, setView]                 = useState<View>('signin')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [name, setName]                 = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [resetting, setResetting]       = useState(false)
  const { user } = useAuth()
  const router    = useRouter()

  useEffect(() => {
    if (user) router.replace('/account')
  }, [user, router])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const sb = supabaseBrowser()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Welcome back!')
    router.push('/account')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Please enter your name'); return }
    setLoading(true)
    const sb = supabaseBrowser()
    const { error } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: undefined, data: { full_name: name } },
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Account created!')
    router.push('/account')
  }

  async function handleForgotPassword() {
    if (!email.trim()) { toast.error('Enter your email above first'); return }
    setResetting(true)
    const sb = supabaseBrowser()
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    })
    setResetting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password reset link sent — check your inbox.')
  }

  return (
    <div className="section-pad pt-20 bg-surface-50 h-full flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo badge + wordmark — matches the rest of the site's identity
            and reacts to whatever theme color is set in /admin/settings */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-glow">
            <img src="/brand/logo.png" alt="Elyvate" className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-primary">
            {view === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {view === 'signin' ? 'Sign in to track orders and manage your wishlist' : 'Join to save your wishlist and track orders'}
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={view === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {view === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input required className="input pl-11" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input required type="email" className="input pl-11" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-11 pr-11"
                  placeholder={view === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  minLength={view === 'signup' ? 6 : undefined}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {view === 'signin' && (
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={handleForgotPassword} disabled={resetting} className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors disabled:opacity-50">
                  {resetting ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {view === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          {view === 'signin' ? (
            <>No account?{' '}
              <button onClick={() => setView('signup')} className="font-medium text-brand-600 hover:text-brand-700 transition-colors">Sign up</button>
            </>
          ) : (
            <>Already have one?{' '}
              <button onClick={() => setView('signin')} className="font-medium text-brand-600 hover:text-brand-700 transition-colors">Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
