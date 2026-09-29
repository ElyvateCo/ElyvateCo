'use client'
import { useState } from 'react'
import { Mail, MessageCircle, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', orderId: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSent(true)
      toast.success('Message sent!')
    } catch {
      toast.error('Failed to send. Please email us directly.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center section-pad pt-28 pb-20">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={28} className="text-green-600" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink-primary mb-2">Message Sent!</h2>
        <p className="text-ink-secondary text-sm">We'll get back to you within 24 hours at <strong>{form.email}</strong></p>
      </div>
    </div>
  )

  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl max-w-xl">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={24} className="text-brand-600" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink-primary mb-2">Contact Us</h1>
          <p className="text-ink-secondary text-sm">We typically respond within 24 hours.</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Your Name</label>
                <input
                  required className="input" placeholder="John Doe"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input
                  required type="email" className="input" placeholder="you@email.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Order ID (optional)</label>
              <input
                className="input font-mono" placeholder="e.g. A1B2C3D4"
                value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                required className="input min-h-[140px] resize-none" placeholder="How can we help you?"
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send size={15} /> Send Message</>
              }
            </button>
            <p className="text-xs text-ink-muted text-center">
              Or email us directly at{' '}
              <a href="mailto:support@elyvate.com" className="text-brand-600 hover:underline">support@elyvate.com</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
