'use client'
import { useRef, useCallback, useEffect } from 'react'

type Particle = {
  el: HTMLSpanElement
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vrot: number
  size: number
  life: number
}

type BurstOptions = {
  emojis?: string[]
  burstCount?: number
  power?: number
  spread?: number
  gravity?: number
  emojiSize?: number
}

const DEFAULTS: Required<BurstOptions> = {
  emojis: ['🎉', '✨', '🛍️', '💸', '✅', '🥳', '🎊', '👍'],
  burstCount: 24,
  power: 14,
  spread: 60,
  gravity: 0.6,
  emojiSize: 22,
}

/**
 * Celebratory emoji-burst effect. Adapted from a Framer "nudge a button"
 * component into a hook you can trigger from any existing button — the
 * burst flies across the whole screen from wherever you call burst(x, y),
 * rather than being confined to a small self-contained widget.
 *
 * Usage:
 *   const { burst, layer } = useEmojiBurst()
 *   <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2) }}>
 *   ...
 *   {layer}
 */
export function useEmojiBurst(options: BurstOptions = {}) {
  const cfg = { ...DEFAULTS, ...options }
  const layerRef     = useRef<HTMLDivElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef        = useRef<number>(0)
  const lastTsRef      = useRef<number>(0)

  const step = useCallback((ts: number) => {
    const arr = particlesRef.current
    let dt = lastTsRef.current ? (ts - lastTsRef.current) / 16.6667 : 1
    lastTsRef.current = ts
    if (dt > 3) dt = 3

    const W = window.innerWidth
    const H = window.innerHeight

    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i]
      p.vy += cfg.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vrot * dt
      p.life -= dt

      if (p.life <= 0 || p.y > H + p.size * 3 || p.x < -p.size * 3 || p.x > W + p.size * 3) {
        p.el.remove()
        arr.splice(i, 1)
        continue
      }
      const fade = p.life < 22 ? Math.max(0, p.life / 22) : 1
      p.el.style.opacity = String(fade)
      p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`
    }

    if (arr.length > 0) {
      rafRef.current = requestAnimationFrame(step)
    } else {
      rafRef.current = 0
      lastTsRef.current = 0
    }
  }, [cfg.gravity])

  const burst = useCallback((originX: number, originY: number) => {
    const layer = layerRef.current
    if (!layer) return

    const arr = particlesRef.current
    const MAX = 160
    const size = cfg.emojiSize

    for (let k = 0; k < cfg.burstCount; k++) {
      if (arr.length >= MAX) break
      const el = document.createElement('span')
      el.textContent = cfg.emojis[(Math.random() * cfg.emojis.length) | 0]
      el.style.position = 'absolute'
      el.style.left = '0px'
      el.style.top = '0px'
      el.style.fontSize = `${size}px`
      el.style.lineHeight = '1'
      el.style.willChange = 'transform, opacity'
      el.setAttribute('aria-hidden', 'true')
      layer.appendChild(el)

      // Angle biased straight up, with random left/right spread — same feel
      // as a firework/confetti burst rather than an even circle.
      const ang = ((-90 + (Math.random() * 2 - 1) * cfg.spread) * Math.PI) / 180
      const speed = cfg.power * (0.65 + Math.random() * 0.8)

      arr.push({
        el,
        x: originX - size / 2,
        y: originY - size / 2,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        rot: Math.random() * 360,
        vrot: (Math.random() * 2 - 1) * 14,
        size,
        life: 70,
      })
    }

    if (!rafRef.current) {
      lastTsRef.current = 0
      rafRef.current = requestAnimationFrame(step)
    }
  }, [cfg.emojis, cfg.burstCount, cfg.power, cfg.spread, cfg.emojiSize, step])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      for (const p of particlesRef.current) p.el.remove()
      particlesRef.current = []
    }
  }, [])

  const layer = (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[200] overflow-hidden"
    />
  )

  return { burst, layer }
}
