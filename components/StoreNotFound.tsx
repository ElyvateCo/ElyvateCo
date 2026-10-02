'use client'
import { useEffect, useState } from 'react'
import { Store } from 'lucide-react'

const PREVIEW_COOKIE = 'elyvate_preview_store'
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase()

// Works out which store address the visitor was trying to open, so the page
// can say "There is no store called "mahin"". Only ever shown as plain text.
function requestedStoreName(): string | null {
  const valid = (v: string | null) => (v && /^[a-z0-9-]{1,30}$/i.test(v) && v.toLowerCase() !== 'off' ? v.toLowerCase() : null)

  const fromQuery = valid(new URLSearchParams(window.location.search).get('store'))
  if (fromQuery) return fromQuery

  const host = window.location.hostname.toLowerCase()
  if (ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) return valid(host.slice(0, -(ROOT_DOMAIN.length + 1)))
  if (host.endsWith('.localhost')) return valid(host.slice(0, -'.localhost'.length))

  const cookie = document.cookie.split('; ').find(c => c.startsWith(`${PREVIEW_COOKIE}=`))
  return cookie ? valid(decodeURIComponent(cookie.split('=')[1] ?? '')) : null
}

export default function StoreNotFound() {
  const [name, setName] = useState<string | null>(null)
  const [homeHref, setHomeHref] = useState('/?store=off')

  useEffect(() => {
    setName(requestedStoreName())
    const host = window.location.hostname.toLowerCase()
    // On a real store address go to the main Elyvate site; on the shared
    // Vercel address just clear the ?store= preview.
    if (ROOT_DOMAIN && host !== ROOT_DOMAIN && host !== `www.${ROOT_DOMAIN}` && host.endsWith(`.${ROOT_DOMAIN}`)) {
      setHomeHref(`https://${ROOT_DOMAIN}`)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 section-pad">
      <div className="card p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-100 text-ink-muted flex items-center justify-center mx-auto mb-5">
          <Store size={26} />
        </div>
        <h1 className="font-display text-2xl font-semibold mb-2">Store not found</h1>
        <p className="text-sm text-ink-secondary mb-6">
          {name
            ? <>There is no store called <span className="font-semibold text-ink-primary">&ldquo;{name}&rdquo;</span> on Elyvate.</>
            : <>We couldn&apos;t find a store at this address.</>}
          {' '}Check the spelling, or create a store of your own.
        </p>
        <div className="space-y-2">
          <a href="/signup" className="btn-primary w-full inline-block">Create your store</a>
          <a href={homeHref} className="btn-outline w-full inline-block">Go to Elyvate</a>
        </div>
      </div>
    </div>
  )
}
