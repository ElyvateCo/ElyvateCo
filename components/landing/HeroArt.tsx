'use client'
import { useEffect, useRef } from 'react'

// Soft background art for the hero: blurred colour blobs and a few small
// floating shapes (coin, parcel, ring, plus, squiggle). They drift slowly and
// shift gently with the mouse/finger — each at its own depth.
export default function HeroArt() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = ref.current
    const area = root?.parentElement
    if (!root || !area) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = area.getBoundingClientRect()
        root.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5))
        root.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5))
      })
    }
    area.addEventListener('pointermove', onMove)
    return () => { area.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])

  // depth = how far the shape travels with the pointer
  const layer = (depth: number) => ({ transform: `translate(calc(var(--mx) * ${depth}px), calc(var(--my) * ${depth}px))` })

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ '--mx': 0, '--my': 0 } as React.CSSProperties}>
      <style>{`
        @keyframes ed-float { 0%,100% { transform: translateY(0) rotate(0deg) } 50% { transform: translateY(-14px) rotate(6deg) } }
        .ed-float { animation: ed-float 7s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .ed-float { animation: none } }
      `}</style>

      {/* blurred colour blobs */}
      <div className="absolute -top-24 -left-24 transition-transform duration-300 ease-out" style={layer(-30)}>
        <div className="w-80 h-80 rounded-full bg-brand-500/20 blur-3xl" />
      </div>
      <div className="absolute top-10 -right-20 transition-transform duration-300 ease-out" style={layer(26)}>
        <div className="w-72 h-72 rounded-full bg-brand-400/20 blur-3xl" />
      </div>
      <div className="absolute bottom-0 left-1/3 transition-transform duration-300 ease-out" style={layer(-18)}>
        <div className="w-64 h-64 rounded-full bg-amber-300/20 blur-3xl" />
      </div>

      {/* taka coin */}
      <div className="absolute top-[18%] left-[8%] hidden sm:block transition-transform duration-300 ease-out" style={layer(40)}>
        <div className="ed-float w-14 h-14 rounded-full bg-amber-300 border-4 border-amber-400 text-amber-800 font-bold text-xl flex items-center justify-center shadow-md">৳</div>
      </div>

      {/* parcel */}
      <div className="absolute top-[26%] right-[9%] hidden sm:block transition-transform duration-300 ease-out" style={layer(-36)}>
        <svg className="ed-float" style={{ animationDelay: '-2s' }} width="56" height="56" viewBox="0 0 56 56" fill="none">
          <path d="M8 18 28 8l20 10v22L28 50 8 40V18Z" fill="rgb(var(--color-brand-100))" stroke="rgb(var(--color-brand-600))" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M8 18l20 10 20-10M28 28v22" stroke="rgb(var(--color-brand-600))" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ring */}
      <div className="absolute bottom-[22%] left-[14%] hidden md:block transition-transform duration-300 ease-out" style={layer(28)}>
        <div className="ed-float w-10 h-10 rounded-full border-[5px] border-brand-400/60" style={{ animationDelay: '-4s' }} />
      </div>

      {/* plus */}
      <div className="absolute bottom-[30%] right-[16%] hidden md:block transition-transform duration-300 ease-out" style={layer(-24)}>
        <svg className="ed-float" style={{ animationDelay: '-1s' }} width="30" height="30" viewBox="0 0 30 30"><path d="M15 3v24M3 15h24" stroke="rgb(var(--color-brand-500))" strokeWidth="5" strokeLinecap="round" /></svg>
      </div>

      {/* squiggle */}
      <div className="absolute top-[8%] right-[34%] hidden lg:block transition-transform duration-300 ease-out" style={layer(20)}>
        <svg className="ed-float" style={{ animationDelay: '-3s' }} width="90" height="24" viewBox="0 0 90 24" fill="none"><path d="M3 12c8-12 14 12 22 0s14 12 22 0 14 12 22 0 14 12 18 0" stroke="rgb(var(--color-brand-400))" strokeWidth="4" strokeLinecap="round" /></svg>
      </div>

      {/* dotted grid */}
      <div className="absolute bottom-[12%] right-[6%] hidden lg:block opacity-60 transition-transform duration-300 ease-out" style={layer(14)}>
        <svg width="84" height="84" viewBox="0 0 84 84">{Array.from({ length: 25 }, (_, i) => <circle key={i} cx={8 + (i % 5) * 17} cy={8 + Math.floor(i / 5) * 17} r="2.6" fill="rgb(var(--color-brand-400))" />)}</svg>
      </div>
    </div>
  )
}
