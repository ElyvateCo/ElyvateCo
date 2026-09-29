'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

export default function AnnouncementBar({ text }: { text: string | null }) {
  const [visible, setVisible] = useState(true)

  if (!text || !visible) return null

  return (
    <div className="bg-brand-600 text-white text-xs sm:text-sm font-medium py-2.5 px-4 text-center relative">
      <span>{text}</span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-lg transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  )
}
