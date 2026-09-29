'use client'
import { useEffect, useRef, useState } from 'react'
import { X, VolumeX, Volume2 } from 'lucide-react'

type Props = { videoUrl: string }

const MIN_W     = 90
const MAX_W     = 300
const DEFAULT_W = 130

export default function PromoVideoPopup({ videoUrl }: Props) {
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [muted,     setMuted]     = useState(true)
  const [pos,       setPos]       = useState({ x: 12, y: 0 })
  const [width,     setWidth]     = useState(DEFAULT_W)
  const [ready,     setReady]     = useState(false)

  const videoRef    = useRef<HTMLVideoElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const popupRef    = useRef<HTMLDivElement>(null)

  const mode        = useRef<'idle' | 'drag' | 'resize' | 'pinch'>('idle')
  const dragStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const resizeStart = useRef({ mx: 0, w: DEFAULT_W })
  const pinchStart  = useRef({ dist: 0, w: DEFAULT_W })
  const posRef      = useRef({ x: 12, y: 0 })
  const widthRef    = useRef(DEFAULT_W)

  useEffect(() => { posRef.current   = pos   }, [pos])
  useEffect(() => { widthRef.current = width }, [width])

  useEffect(() => {
    const y = window.innerHeight - DEFAULT_W * (16 / 9) - 80
    setPos({ x: 12, y })
    posRef.current = { x: 12, y }
    setReady(true)
  }, [])

  useEffect(() => {
    if (dismissed || !ready) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        setTimeout(() => videoRef.current?.play().catch(() => {}), 400)
      }
    }, { threshold: 0.1 })
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [dismissed, ready])

  // ── Shared move/resize logic, driven by plain {x,y} coordinates so both
  // touch and mouse handlers can feed into the exact same code path. ──────
  useEffect(() => {
    function getPopupBounds() {
      const w = widthRef.current
      const h = w * (16 / 9)
      return { w, h }
    }

    function moveDrag(clientX: number, clientY: number) {
      const dx = clientX - dragStart.current.mx
      const dy = clientY - dragStart.current.my
      const { w, h } = getPopupBounds()
      const newX = Math.max(0, Math.min(window.innerWidth  - w, dragStart.current.px + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - h, dragStart.current.py + dy))
      setPos({ x: newX, y: newY })
      posRef.current = { x: newX, y: newY }
    }

    function moveResize(clientX: number) {
      const dx   = clientX - resizeStart.current.mx
      const newW = Math.max(MIN_W, Math.min(MAX_W, resizeStart.current.w + dx))
      setWidth(newW)
      widthRef.current = newW
    }

    // Touch
    function onTouchMove(e: TouchEvent) {
      if (mode.current === 'idle') return
      e.preventDefault()

      if (mode.current === 'pinch' && e.touches.length === 2) {
        const dx   = e.touches[0].clientX - e.touches[1].clientX
        const dy   = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const scale = dist / pinchStart.current.dist
        const newW  = Math.max(MIN_W, Math.min(MAX_W, pinchStart.current.w * scale))
        setWidth(newW)
        widthRef.current = newW
        return
      }
      if (mode.current === 'resize' && e.touches.length >= 1) {
        moveResize(e.touches[0].clientX)
        return
      }
      if (mode.current === 'drag' && e.touches.length >= 1) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    function onTouchEnd() { mode.current = 'idle' }

    // Mouse — same state machine, just fed from mouse coordinates instead
    // of touch points. This is what was entirely missing before: the popup
    // could only be dragged/resized on touchscreens, never with a mouse.
    function onMouseMove(e: MouseEvent) {
      if (mode.current === 'idle') return
      if (mode.current === 'resize') { moveResize(e.clientX); return }
      if (mode.current === 'drag')   { moveDrag(e.clientX, e.clientY) }
    }
    function onMouseUp() { mode.current = 'idle' }

    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend',  onTouchEnd,  { passive: true  })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend',  onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [])

  function onPopupTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    if (target.closest('[data-resize]')) return

    if (e.touches.length === 2) {
      mode.current = 'pinch'
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStart.current = { dist: Math.hypot(dx, dy), w: widthRef.current }
      return
    }

    mode.current = 'drag'
    dragStart.current = {
      mx: e.touches[0].clientX,
      my: e.touches[0].clientY,
      px: posRef.current.x,
      py: posRef.current.y,
    }
  }

  function onResizeTouchStart(e: React.TouchEvent) {
    e.stopPropagation()
    mode.current = 'resize'
    resizeStart.current = { mx: e.touches[0].clientX, w: widthRef.current }
  }

  // Mouse equivalents — mirrors the touch handlers above exactly, minus
  // pinch (a touch-only gesture with no mouse equivalent; mouse users get
  // drag-to-move and drag-the-corner-to-resize, which covers "bigger and
  // smaller" the same way pinch does on mobile).
  function onPopupMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    if (target.closest('[data-resize]')) return

    mode.current = 'drag'
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      px: posRef.current.x,
      py: posRef.current.y,
    }
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    mode.current = 'resize'
    resizeStart.current = { mx: e.clientX, w: widthRef.current }
  }

  function dismiss() {
    setVisible(false)
    setDismissed(true)
    videoRef.current?.pause()
  }

  return (
    <>
      <div ref={sentinelRef} className="h-1 w-full" />

      {!dismissed && ready && (
        <div
          ref={popupRef}
          onTouchStart={onPopupTouchStart}
          onMouseDown={onPopupMouseDown}
          className={`fixed z-50 select-none transition-[opacity,transform] duration-500 ease-out cursor-grab active:cursor-grabbing ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
          style={{ left: pos.x, top: pos.y, width, touchAction: 'none' }}
        >
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/20"
            style={{ aspectRatio: '9/16' }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              loop muted={muted} playsInline autoPlay
            />
            <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

            <button
              onClick={dismiss}
              className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <X size={11} />
            </button>

            <button
              onClick={() => setMuted(m => !m)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
            </button>

            <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

            <div
              data-resize="true"
              onTouchStart={onResizeTouchStart}
              onMouseDown={onResizeMouseDown}
              className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center cursor-nwse-resize"
              style={{ touchAction: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 11L11 5M8 14L14 8M11 14L14 11" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"/>
              </svg>
            </div>

            <p className="absolute bottom-8 inset-x-0 text-center text-white/30 text-[8px] pointer-events-none">
              drag to move · drag corner to resize
            </p>
          </div>
        </div>
      )}
    </>
  )
}
