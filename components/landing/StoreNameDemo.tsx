'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
}

// Type a shop name → see the store address you'd get → continue to sign-up
// with the name already filled in.
export default function StoreNameDemo({ rootDomain }: { rootDomain: string }) {
  const [name, setName] = useState('')
  const slug = slugify(name) || 'yourshop'
  const href = name.trim() ? `/signup?store=${encodeURIComponent(name.trim().slice(0, 40))}` : '/signup'

  return (
    <div className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-card border border-surface-200">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Type your shop name"
          maxLength={40}
          aria-label="Your shop name"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-transparent outline-none text-sm placeholder:text-ink-muted"
        />
        <Link href={href} className="btn-primary inline-flex items-center justify-center gap-2 !px-6 !py-3 whitespace-nowrap">
          Create my store <ArrowRight size={16} />
        </Link>
      </div>
      <p className="mt-3 text-sm text-ink-secondary">
        Your store address: <span className="font-semibold text-brand-700 break-all">{slug}.{rootDomain}</span>
      </p>
    </div>
  )
}
