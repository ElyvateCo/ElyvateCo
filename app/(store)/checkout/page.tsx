'use client'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '@/lib/cartStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShieldCheck, Lock, Tag, X, CheckCircle2, CreditCard, Coins, Copy, Check, Mail } from 'lucide-react'
import { useEmojiBurst } from '@/lib/useEmojiBurst'
import { supabase } from '@/lib/supabase'
import { useStoreId } from '@/lib/storeContext'
import { rememberOrder } from '@/lib/myOrders'
import Loader from '@/components/ui/loader'

export const dynamic = 'force-dynamic'

type FormData = {
  name: string; email: string; phone: string
  address: string; city: string; country: string; zip: string
}

type CouponState = {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  discountAmount: number
  finalTotal: number
} | null

type CryptoPaymentInfo = {
  currency: string
  network: string
  address: string
  amount: number
  reference: string
}

export default function CheckoutPage() {
  const storeId = useStoreId()
  const { items, total, clearCart } = useCart()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '',
    address: '', city: '', country: '', zip: '',
  })
  const submitBtnRef = useRef<HTMLButtonElement>(null)
  const { burst, layer: emojiLayer } = useEmojiBurst()

  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<CouponState>(null)

  // Payment method modal + crypto flow
  const [showMethodModal, setShowMethodModal] = useState(false)
  const [cryptoEnabled, setCryptoEnabled] = useState(false)
  const [cryptoResult, setCryptoResult] = useState<CryptoPaymentInfo | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted && items.length === 0 && !cryptoResult) router.push('/cart')
  }, [mounted, items.length, router, cryptoResult])

  useEffect(() => {
    if (!storeId) return
    supabase.from('site_settings').select('crypto_usdt_enabled').eq('store_id', storeId).maybeSingle().then(({ data }) => {
      setCryptoEnabled(!!data?.crypto_usdt_enabled)
    })
  }, [storeId])

  if (!mounted || (items.length === 0 && !cryptoResult)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const update = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const cartTotal = total()
  const finalTotal = appliedCoupon ? appliedCoupon.finalTotal : cartTotal

  async function applyCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), cartTotal }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Invalid coupon')
        return
      }
      setAppliedCoupon(data)
      toast.success(`Coupon applied! You save $${data.discountAmount.toFixed(2)}`)
    } catch {
      toast.error('Failed to apply coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponInput('')
    toast.success('Coupon removed')
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Native HTML5 required-field validation already ran by the time a
    // submit event fires, so if we're here the form itself is valid —
    // now ask which payment method before actually creating the order.
    setShowMethodModal(true)
  }

  async function processPayment(method: 'card' | 'crypto_usdt') {
    setShowMethodModal(false)

    // Fire the celebration from wherever the actual submit button is, then
    // give it a brief moment to be visible before the page navigates away —
    // otherwise a fast response could redirect before the user ever sees it.
    if (submitBtnRef.current) {
      const r = submitBtnRef.current.getBoundingClientRect()
      burst(r.left + r.width / 2, r.top + r.height / 2)
    }

    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 450))

    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form,
          items,
          total: finalTotal,
          couponCode: appliedCoupon?.code ?? null,
          discountAmount: appliedCoupon?.discountAmount ?? 0,
          paymentMethod: method,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      // Remember this order in the browser's own local list — this is what
      // lets the notification bell later show "your order is processing"
      // for guests too, with no account/login involved.
      rememberOrder(data.orderId)

      if (method === 'crypto_usdt') {
        setCryptoResult(data.crypto)
        clearCart()
        setLoading(false)
      } else {
        window.location.href = data.paymentUrl
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order')
      setLoading(false)
    }
  }

  function copyAddress() {
    if (!cryptoResult) return
    // navigator.clipboard can be undefined in restricted contexts (some
    // in-app browsers disable it entirely) — calling .writeText on
    // undefined would throw and crash the page, same class of bug as the
    // unguarded localStorage calls.
    if (!navigator.clipboard) {
      toast.error('Copy not available here — press and hold the address to copy it manually.')
      return
    }
    navigator.clipboard.writeText(cryptoResult.address).then(() => {
      setCopied(true)
      toast.success('Address copied!')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Copy not available here — press and hold the address to copy it manually.')
    })
  }

  // Crypto order created — show payment instructions instead of the form.
  if (cryptoResult) {
    return (
      <div className="section-pad pt-28 pb-20 min-h-screen bg-surface-50">
        <div className="container-xl max-w-lg">
          <div className="card p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <Coins size={26} className="text-brand-600" />
            </div>
            <h1 className="font-display text-2xl font-semibold mb-2">Complete your USDT payment</h1>
            <p className="text-sm text-ink-secondary mb-6">
              Send exactly the amount below to complete your order. We'll email you once we've confirmed the payment
              — usually within a few hours.
            </p>

            <div className="bg-surface-50 rounded-2xl p-5 mb-4 text-left space-y-4">
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Amount to send</p>
                <p className="text-2xl font-bold text-ink-primary">{cryptoResult.amount.toFixed(2)} USDT</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Network</p>
                <p className="font-semibold text-ink-primary">{cryptoResult.network}</p>
                <p className="text-xs text-red-500 mt-1">Only send USDT on the {cryptoResult.network} network to this address — funds sent on the wrong network cannot be recovered.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Send to this address</p>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-surface-300 p-3">
                  <code className="text-xs break-all flex-1">{cryptoResult.address}</code>
                  <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-surface-100 text-ink-secondary shrink-0" aria-label="Copy address">
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Your order reference</p>
                <p className="font-mono font-semibold text-ink-primary">#{cryptoResult.reference}</p>
              </div>
            </div>

            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cryptoResult.address)}`}
              alt="QR code for USDT address"
              width={160}
              height={160}
              className="mx-auto rounded-xl border border-surface-200 mb-6"
            />

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-left mb-6">
              <Mail size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Keep your order reference (<strong>#{cryptoResult.reference}</strong>) handy — if you contact us about this order, mention it so we can find your payment quickly.
              </p>
            </div>

            <button onClick={() => router.push('/')} className="btn-secondary w-full">
              Return to Store
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section-pad pt-28 pb-20">
      <div className="container-xl">
        <h1 className="font-display text-3xl font-semibold mb-10">Checkout</h1>

        <form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact */}
              <div className="card p-6">
                <h2 className="font-semibold text-lg mb-5">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input required className="input" placeholder="John Doe" value={form.name} onChange={update('name')} />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input required type="email" className="input" placeholder="john@email.com" value={form.email} onChange={update('email')} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Phone Number</label>
                    <input required className="input" placeholder="+1 234 567 8900" value={form.phone} onChange={update('phone')} />
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="card p-6">
                <h2 className="font-semibold text-lg mb-5">Shipping Address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Street Address</label>
                    <input required className="input" placeholder="123 Main St, Apt 4" value={form.address} onChange={update('address')} />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input required className="input" placeholder="New York" value={form.city} onChange={update('city')} />
                  </div>
                  <div>
                    <label className="label">ZIP / Postal Code</label>
                    <input required className="input" placeholder="10001" value={form.zip} onChange={update('zip')} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Country</label>
                    <select required className="input" value={form.country} onChange={update('country')}>
                      <option value="">Select country</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="AE">UAE</option>
                      <option value="SG">Singapore</option>
                      <option value="IN">India</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment info */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Lock size={18} className="text-brand-600" />
                  <h2 className="font-semibold text-lg">Secure Payment</h2>
                </div>
                <p className="text-sm text-ink-secondary">
                  {cryptoEnabled
                    ? "You'll choose between card payment or USDT (crypto) on the next step."
                    : "You'll be redirected to a secure payment page to complete your purchase. We accept all major credit/debit cards."}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="card p-6 h-fit sticky top-24">
              <h2 className="font-display text-xl font-semibold mb-5">Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-5">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-ink-secondary truncate mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm text-ink-secondary">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
              </div>

              {/* Coupon input */}
              <div className="border-t border-surface-200 pt-4 mb-4">
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Discount Code</p>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-green-800 font-mono">{appliedCoupon.code}</p>
                        <p className="text-xs text-green-700">
                          {appliedCoupon.type === 'percentage'
                            ? `${appliedCoupon.value}% off`
                            : `$${appliedCoupon.value.toFixed(2)} off`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="p-1 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input text-sm uppercase py-2.5"
                      placeholder="Enter code"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="btn-secondary shrink-0 flex items-center gap-1.5 py-2.5 px-4 text-xs"
                    >
                      {couponLoading
                        ? <span className="w-3.5 h-3.5 border-2 border-ink-primary border-t-transparent rounded-full animate-spin" />
                        : <Tag size={13} />}
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-surface-200 pt-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm text-ink-secondary">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Discount</span>
                    <span>−${appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl pt-1">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button ref={submitBtnRef} type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Pay ${finalTotal.toFixed(2)}
                  </>
                )}
              </button>
              <p className="text-xs text-ink-muted text-center mt-3">
                Secured by 2Checkout · SSL encrypted
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Payment method modal — opens when "Pay" is clicked, before any
          order is actually created */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            {!loading && (
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-semibold">Choose Payment Method</h2>
                <button onClick={() => setShowMethodModal(false)} className="p-2 rounded-xl hover:bg-surface-100 transition-colors">
                  <X size={18} />
                </button>
              </div>
            )}

            {loading ? (
              <Loader
                size="sm"
                title="Processing your order..."
                subtitle="Just a moment, almost there"
              />
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => processPayment('card')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-300 hover:border-brand-600 hover:bg-brand-50/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                    <CreditCard size={20} className="text-ink-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink-primary">Card Payment</p>
                    <p className="text-xs text-ink-muted">Credit or debit card</p>
                  </div>
                </button>

                {cryptoEnabled && (
                  <button
                    onClick={() => processPayment('crypto_usdt')}
                    disabled={loading}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-300 hover:border-brand-600 hover:bg-brand-50/40 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                      <Coins size={20} className="text-ink-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-ink-primary">Pay with USDT</p>
                      <p className="text-xs text-ink-muted">Crypto — manual verification</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {emojiLayer}
    </div>
  )
}
