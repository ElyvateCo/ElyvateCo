'use client'
import { Sun, Moon } from 'lucide-react'
import { useDarkMode } from '@/lib/useDarkMode'

export default function DarkModeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle, mounted } = useDarkMode()

  // Avoid rendering an icon that might not match the real state until
  // we've confirmed what's actually applied client-side (dark mode is a
  // client-only preference read from localStorage).
  if (!mounted) {
    return <div className={`w-10 h-10 rounded-full ${className}`} aria-hidden="true" />
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
