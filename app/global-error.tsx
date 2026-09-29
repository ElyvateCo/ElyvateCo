'use client'
import { useEffect } from 'react'

// This only fires for errors in the ROOT layout itself (app/layout.tsx) —
// a normal app/error.tsx can't catch those since it can't replace the
// <html>/<body> tags that broke. Deliberately uses plain inline styles
// instead of Tailwind classes: if something in the root layout is broken
// badly enough to trigger this, we can't assume the rest of the app's
// CSS/theme system is in a working state either.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[ROOT LAYOUT] ${error.message}`,
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : null,
      }),
    }).catch(() => {})
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
              We've logged this automatically. Try reloading the page.
            </p>
            <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 16, padding: 16, marginBottom: 24, textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#555', wordBreak: 'break-word', margin: 0 }}>
                {error.message || 'Unknown error'}
              </p>
              {error.digest && <p style={{ fontSize: 10, color: '#999', marginTop: 8 }}>Ref: {error.digest}</p>}
            </div>
            <button
              onClick={reset}
              style={{ background: '#4A4DDE', color: '#fff', border: 'none', borderRadius: 16, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
