'use client'
import { useEffect, useState } from 'react'
import { Share2, Check } from 'lucide-react'

type Step = { n: string; title: string; text: string }
const SWATCH = ['#4F46E5', '#E11D48', '#059669']

// Three steps you can tap (or just watch — it plays through on its own),
// each with a small animated picture of what happens.
export default function HowItWorks({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => setActive(a => (a + 1) % steps.length), 5500)
    return () => clearTimeout(t)
  }, [active, auto, steps.length])

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <style>{`
        @keyframes ed-fill { from { width: 0 } to { width: 100% } }
        @keyframes ed-type { from { width: 0 } to { width: 100% } }
        @keyframes ed-caret { 50% { border-color: transparent } }
        @keyframes ed-pop { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.05) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes ed-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes ed-tint { 0%,100% { background: ${SWATCH[0]} } 33% { background: ${SWATCH[1]} } 66% { background: ${SWATCH[2]} } }
        @keyframes ed-ring { 0%,100% { opacity: 1 } 33%,66% { opacity: 0 } }
        @keyframes ed-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
        .hw-type { overflow: hidden; white-space: nowrap; border-right: 2px solid currentColor; animation: ed-type 1.8s steps(13) .3s both, ed-caret .8s step-end infinite }
        @media (prefers-reduced-motion: reduce) { .hw-anim, .hw-anim * { animation: none !important } }
      `}</style>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <button key={s.n} onClick={() => { setActive(i); setAuto(false) }}
            className={`w-full text-left rounded-2xl p-4 border transition-all ${i === active ? 'bg-white shadow-card border-brand-200' : 'border-transparent hover:bg-white/60'}`}>
            <div className="flex items-start gap-3">
              <span className={`w-9 h-9 rounded-full font-bold flex items-center justify-center shrink-0 transition-colors ${i === active ? 'bg-brand-600 text-white' : 'bg-surface-200 text-ink-secondary'}`}>{s.n}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className={`text-sm text-ink-secondary leading-relaxed overflow-hidden transition-all ${i === active ? 'max-h-24 mt-1' : 'max-h-0'}`}>{s.text}</p>
              </div>
            </div>
            {i === active && (
              <div className="mt-3 h-1 rounded-full bg-surface-200 overflow-hidden">
                <div key={`${active}-${auto}`} className="h-full bg-brand-500" style={{ width: auto ? undefined : '100%', animation: auto ? 'ed-fill 5.5s linear forwards' : 'none' }} />
              </div>
            )}
          </button>
        ))}
      </div>

      <div key={active} className="hw-anim relative h-72 rounded-3xl bg-gradient-to-br from-brand-50 to-white border border-brand-100 overflow-hidden p-5 flex items-center justify-center">
        {active === 0 && (
          <div className="w-full max-w-[260px] bg-white rounded-2xl shadow-card p-4">
            <p className="text-[10px] text-ink-muted mb-1">Store name</p>
            <div className="border border-surface-300 rounded-lg px-3 py-2 text-sm font-semibold"><span className="hw-type inline-block align-bottom">Rahim Fashion</span></div>
            <p className="text-[10px] text-ink-muted mt-3 mb-1">Your address</p>
            <p className="text-xs font-semibold text-brand-700" style={{ animation: 'ed-fade .5s ease-out 2.1s both' }}>rahim-fashion.elyvateco.com</p>
            <div className="mt-4 rounded-lg bg-brand-600 text-white text-xs font-bold text-center py-2.5" style={{ animation: 'ed-pulse 1.4s ease-in-out 2.4s infinite' }}>Create store</div>
          </div>
        )}
        {active === 1 && (
          <div className="w-full max-w-[260px] bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="h-20 relative" style={{ animation: 'ed-tint 4.5s ease-in-out infinite' }}>
              <p className="absolute left-3 bottom-2 text-white font-bold text-sm">Rahim Fashion</p>
            </div>
            <div className="p-4">
              <p className="text-[10px] text-ink-muted mb-2">Choose your colour</p>
              <div className="flex gap-3">
                {SWATCH.map((c, i) => (
                  <span key={c} className="relative w-8 h-8 rounded-full" style={{ background: c }}>
                    <span className="absolute -inset-1 rounded-full border-2 border-ink-primary" style={{ animation: 'ed-ring 4.5s ease-in-out infinite', animationDelay: `${i * 1.5 - 0.75}s`, opacity: i === 0 ? 1 : 0 }} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        {active === 2 && (
          <div className="w-full max-w-[270px]">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-card p-2" style={{ animation: `ed-pop .45s ease-out ${i * 0.35}s both` }}>
                  <div className="h-10 rounded-lg" style={{ background: `${SWATCH[i]}22` }}><div className="h-full w-full flex items-center justify-center"><span className="w-5 h-5 rounded-md" style={{ background: SWATCH[i] }} /></div></div>
                  <p className="text-[9px] font-semibold mt-1.5">Product {i + 1}</p>
                  <p className="text-[9px] text-ink-secondary">৳{(i + 1) * 650}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 bg-white rounded-xl shadow-card px-3 py-2" style={{ animation: 'ed-fade .5s ease-out 1.3s both' }}>
              <Share2 size={14} className="text-brand-600 shrink-0" /><span className="text-[11px] font-semibold text-brand-700 truncate">rahim-fashion.elyvateco.com</span>
            </div>
            <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-3 py-2 text-[11px] font-semibold" style={{ animation: 'ed-fade .5s ease-out 2.2s both' }}>
              <Check size={13} /> New order · ৳1,300
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
