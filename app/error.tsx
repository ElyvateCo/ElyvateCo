'use client'
import { useEffect } from 'react'
import { RefreshCw, Home, AlertTriangle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Auto-report so we can actually see what broke, instead of relying on
    // someone screenshotting a generic message with no detail.
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : null,
      }),
    }).catch(() => {})
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-0">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={26} className="text-red-500" />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink-primary mb-2">Something went wrong</h1>
        <p className="text-sm text-ink-secondary mb-5">
          We've logged this automatically. Try again, or head back to the homepage.
        </p>

        {/* Visible error detail — deliberately shown (not hidden behind
            devtools) since this is the only practical way for someone on
            mobile to report back exactly what broke. */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 mb-6 text-left">
          <p className="text-xs font-mono text-ink-secondary break-words">{error.message || 'Unknown error'}</p>
          {error.digest && <p className="text-[10px] text-ink-muted mt-2">Ref: {error.digest}</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={reset} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <RefreshCw size={15} /> Try Again
          </button>
          <a href="/" className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Home size={15} /> Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
