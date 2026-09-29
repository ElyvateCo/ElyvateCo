'use client'
import { useId, useMemo, CSSProperties } from 'react'

type Ease = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'circIn' | 'circOut' | 'circInOut' | 'backIn' | 'backOut' | 'backInOut' | [number, number, number, number]

type TextMorphProps = {
  /** Words/phrases to cycle through. Needs at least 2 to animate. */
  words: string[]
  /** Text color. Defaults to inherit (matches surrounding text color). */
  color?: string
  /** Seconds spent morphing from one word to the next. */
  morphDuration?: number
  /** Seconds each word stays fully visible before morphing to the next. */
  holdDuration?: number
  ease?: Ease
  className?: string
}

// Maps an easing name/cubic-bezier array to a CSS animation-timing-function.
function mapEaseToCSS(ease: Ease): string {
  if (Array.isArray(ease)) return `cubic-bezier(${ease.join(',')})`
  switch (ease) {
    case 'linear':     return 'linear'
    case 'easeIn':     return 'ease-in'
    case 'easeOut':    return 'ease-out'
    case 'easeInOut':  return 'ease-in-out'
    case 'circIn':     return 'cubic-bezier(0.6, 0.04, 0.98, 0.335)'
    case 'circOut':    return 'cubic-bezier(0.075, 0.82, 0.165, 1)'
    case 'circInOut':  return 'cubic-bezier(0.785, 0.135, 0.15, 0.86)'
    case 'backIn':     return 'cubic-bezier(0.6, -0.28, 0.735, 0.045)'
    case 'backOut':    return 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    case 'backInOut':  return 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    default:           return 'ease-in-out'
  }
}

/**
 * Cycles through a list of words with a "gooey" morph/blur transition
 * (via an SVG threshold filter) instead of a plain crossfade.
 *
 * Sizing is intentionally hands-off: it inherits font-size/family/weight/
 * line-height from whatever wraps it, so it responds to normal Tailwind
 * classes (e.g. `text-4xl sm:text-5xl lg:text-7xl`) instead of needing a
 * fixed pixel size like the original Framer version did.
 */
export default function TextMorph({
  words,
  color = 'inherit',
  morphDuration = 1,
  holdDuration = 1,
  ease = 'easeInOut',
  className,
}: TextMorphProps) {
  const morph = Math.max(0.1, morphDuration)
  const hold  = Math.max(0, holdDuration)
  const easeCSS = mapEaseToCSS(ease)

  const wordList = useMemo(
    () => words.map(w => w.trim()).filter(Boolean),
    [words]
  )

  const rawId  = useId()
  const safeId = rawId.replace(/[:]/g, '')
  const filterId = `tm-thr-${safeId}`
  const animName = `tm-rot-${safeId}`

  const count = Math.max(1, wordList.length)
  // Per-word slot = morph (transition) + hold (visible). Full loop = count
  // slots; each word's animation runs the whole loop, offset by its slot, so
  // word i's morph-out overlaps word i+1's morph-in.
  const slot  = morph + hold
  const cycle = slot * count
  const pct = (s: number) => Math.min(100, (s / cycle) * 100).toFixed(4)
  const mIn   = pct(morph)
  const mHold = pct(morph + hold)
  const mOut  = pct(2 * morph + hold)

  const keyframes = `
@keyframes ${animName} {
  0% { opacity: 0; filter: blur(20px); transform: translate(-50%, -50%) scale(0.8); }
  ${mIn}% { opacity: 1; filter: blur(0px); transform: translate(-50%, -50%) scale(1); }
  ${mHold}% { opacity: 1; filter: blur(0px); transform: translate(-50%, -50%) scale(1); }
  ${mOut}%, 100% { opacity: 0; filter: blur(20px); transform: translate(-50%, -50%) scale(1.2); }
}`

  const longest = wordList.reduce((acc, w) => (w.length > acc.length ? w : acc), '')

  // If there's nothing to animate (0 or 1 word), just render plain text —
  // no point paying for the SVG filter / keyframes for a static headline.
  if (wordList.length < 2) {
    return <span className={className} style={{ color }}>{wordList[0] ?? ''}</span>
  }

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        lineHeight: 'inherit',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        fontWeight: 'inherit',
        verticalAlign: 'top',
      }}
    >
      <style>{keyframes}</style>

      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden>
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 25 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          justifyContent: 'center',
          alignItems: 'center',
          filter: `url(#${filterId})`,
        }}
      >
        {/* Width anchor: longest word reserves space so layout never shifts */}
        <span style={{ visibility: 'hidden', whiteSpace: 'nowrap', display: 'inline-block' }}>
          {longest || ' '}
        </span>

        {wordList.map((word, i) => (
          <span
            key={`${word}-${i}`}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0,
              color,
              whiteSpace: 'nowrap',
              animation: `${animName} ${cycle}s ${(slot * i).toFixed(3)}s infinite ${easeCSS}`,
              willChange: 'opacity, filter, transform',
            } as CSSProperties}
          >
            {word}
          </span>
        ))}
      </span>
    </span>
  )
}
