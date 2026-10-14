'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ShoppingBag, Check } from 'lucide-react'
import { formatPrice } from '@/lib/money'

const COLORS = [
  { name: 'Indigo', hex: '#4F46E5' }, { name: 'Rose', hex: '#E11D48' }, { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' }, { name: 'Ink', hex: '#111827' },
]
const PRODUCTS = [
  { id: 'tee', name: 'Cotton tee', price: 850 },
  { id: 'bag', name: 'Canvas bag', price: 1250 },
]
const ORDERS = [
  ['Dhaka', 1250, 'bKash'], ['Chattogram', 850, 'Cash on Delivery'], ['Sylhet', 2100, 'Nagad'], ['Rajshahi', 1700, 'Cash on Delivery'],
] as const

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)

function ProductArt({ id, color }: { id: string; color: string }) {
  return id === 'tee' ? (
    <svg viewBox="0 0 80 64" className="w-full h-full"><path d="M26 8 8 18l8 12 8-4v30h32V26l8 4 8-12L54 8c-2 6-8 9-14 9S28 14 26 8Z" fill={color} opacity=".9" /><path d="M26 8c2 6 8 9 14 9s12-3 14-9" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" /></svg>
  ) : (
    <svg viewBox="0 0 80 64" className="w-full h-full"><path d="M28 24c0-12 24-12 24 0" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" /><rect x="18" y="22" width="44" height="34" rx="6" fill={color} opacity=".9" /><circle cx="40" cy="38" r="4" fill="#fff" opacity=".6" /></svg>
  )
}

// A tiny live store: type a name, pick a colour, add to cart, place an order —
// everything updates instantly. Nothing is saved; it's only a preview.
export default function LiveStoreDemo({ rootDomain }: { rootDomain: string }) {
  const [name, setName] = useState('')
  const [ci, setCi] = useState(0)
  const [cart, setCart] = useState<string[]>([])
  const [placed, setPlaced] = useState(false)
  const [tick, setTick] = useState(0)

  const color = COLORS[ci].hex
  const shop = name.trim() || 'Your shop'
  const slug = slugify(name) || 'yourshop'
  const total = cart.reduce((s, id) => s + (PRODUCTS.find(p => p.id === id)?.price ?? 0), 0)
  const href = name.trim() ? `/signup?store=${encodeURIComponent(name.trim().slice(0, 40))}` : '/signup'

  useEffect(() => {
    const t = setInterval(() => setTick(x => (x + 1) % ORDERS.length), 3400)
    return () => clearInterval(t)
  }, [])

  function place() {
    setPlaced(true)
    setTimeout(() => { setPlaced(false); setCart([]) }, 2600)
  }

  const [city, amount, method] = ORDERS[tick]

  return (
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <style>{`
        @keyframes ed-pop { 0% { transform: scale(.7); opacity: 0 } 70% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes ed-slide { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .ed-pop { animation: ed-pop .4s ease-out both } .ed-slide { animation: ed-slide .45s ease-out both }
        @media (prefers-reduced-motion: reduce) { .ed-pop, .ed-slide { animation: none } }
      `}</style>

      {/* controls */}
      <div className="text-center md:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Try it live</p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">Watch your store take shape</h2>

        <input
          value={name} onChange={e => setName(e.target.value)} maxLength={40} aria-label="Your shop name"
          placeholder="Type your shop name…"
          className="input w-full text-base"
        />
        <p className="mt-2 text-sm text-ink-secondary">Your address: <span className="font-semibold text-brand-700 break-all">{slug}.{rootDomain}</span></p>

        <div className="mt-5">
          <p className="text-xs text-ink-muted mb-2">Pick a colour</p>
          <div className="flex gap-2.5 justify-center md:justify-start">
            {COLORS.map((c, i) => (
              <button key={c.name} onClick={() => setCi(i)} aria-label={c.name}
                className={`w-9 h-9 rounded-full transition-transform ${i === ci ? 'scale-110 ring-2 ring-offset-2 ring-ink-primary' : 'hover:scale-105'}`}
                style={{ background: c.hex }} />
            ))}
          </div>
        </div>

        <Link href={href} className="btn-primary inline-flex items-center justify-center gap-2 !px-7 !py-3.5 mt-6">
          Create my store <ArrowRight size={16} />
        </Link>
        <p className="mt-3 text-xs text-ink-muted">This is just a preview — nothing is saved. Free to start.</p>
      </div>

      {/* the live store */}
      <div className="relative mx-auto">
        <div className="w-[272px] rounded-[2rem] border-[6px] border-ink-primary bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 transition-colors" style={{ background: color }}>{shop[0].toUpperCase()}</span>
              <span className="text-sm font-bold truncate">{shop}</span>
            </div>
            <span className="relative shrink-0">
              <ShoppingBag size={18} />
              {cart.length > 0 && <span key={cart.length} className="ed-pop absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: color }}>{cart.length}</span>}
            </span>
          </div>

          <div className="relative h-24 overflow-hidden transition-colors" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 272 96" preserveAspectRatio="xMidYMid slice"><circle cx="230" cy="20" r="46" fill="#fff" opacity=".12" /><circle cx="40" cy="88" r="36" fill="#fff" opacity=".1" /><path d="M0 70c40-20 80 20 130 0s90-10 142 6v20H0Z" fill="#fff" opacity=".1" /></svg>
            <div className="relative p-3 text-white"><p className="text-[10px] uppercase tracking-widest opacity-80">New arrivals</p><p className="text-lg font-bold leading-tight">Fresh picks<br />for you</p></div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-3">
            {PRODUCTS.map(p => (
              <div key={p.id} className="rounded-xl border border-surface-200 p-2">
                <div className="h-14 bg-surface-50 rounded-lg p-1.5"><ProductArt id={p.id} color={color} /></div>
                <p className="text-[11px] font-semibold mt-1.5 truncate">{p.name}</p>
                <p className="text-[11px] text-ink-secondary">{formatPrice(p.price)}</p>
                <button onClick={() => !placed && setCart(c => [...c, p.id])} className="mt-1.5 w-full text-[10px] font-semibold text-white rounded-lg py-1.5 active:scale-95 transition" style={{ background: color }}>Add</button>
              </div>
            ))}
          </div>

          <div className="px-3 pb-3 h-[58px]">
            {placed ? (
              <div className="ed-pop rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-semibold flex items-center justify-center gap-1.5 h-full"><Check size={14} /> Order received!</div>
            ) : cart.length > 0 ? (
              <button onClick={place} className="ed-slide w-full h-full rounded-xl text-white text-xs font-bold" style={{ background: color }}>Place order · {formatPrice(total)}</button>
            ) : (
              <p className="text-[11px] text-ink-muted text-center pt-3">Tap “Add” to try an order</p>
            )}
          </div>
        </div>

        {/* an example order arriving */}
        <div key={tick} className="ed-slide absolute -bottom-4 -left-4 sm:-left-14 bg-white rounded-2xl shadow-lg border border-surface-200 px-3 py-2 flex items-center gap-2.5 max-w-[230px]">
          <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Check size={15} /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold truncate">New order · {city}</p>
            <p className="text-[10px] text-ink-secondary truncate">{formatPrice(amount)} · {method}</p>
            <p className="text-[9px] text-ink-muted">example</p>
          </div>
        </div>
      </div>
    </div>
  )
}
