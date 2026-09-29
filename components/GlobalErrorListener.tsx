'use client'
import { useEffect } from 'react'

// React error boundaries (error.tsx) only catch errors thrown during
// rendering — NOT errors in event handlers, useEffect callbacks, or
// unhandled promise rejections. A lot of recent code lives exactly there
// (Supabase Realtime callbacks, fetch chains, setTimeout), so this closes
// that gap by listening at the window level and reporting everything.
export default function GlobalErrorListener() {
  useEffect(() => {
    function report(message: string, stack?: string) {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, stack, url: window.location.href }),
      }).catch(() => {})
    }

    function onError(event: ErrorEvent) {
      report(event.message || 'Unknown window error', event.error?.stack)
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      report(`[unhandled promise] ${message}`, reason instanceof Error ? reason.stack : undefined)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
