'use client'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '@/lib/cartStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShieldCheck, Lock, Tag, X, CheckCircle2, Coins, Copy, Check, Mail, Banknote, Smartphone } from 'lucide-react'
import { useEmojiBurst } from '@/lib/useEmojiBurst'
import { supabase } from '@/lib/supabase'
import { useStoreId } from '@/lib/storeContext'
import { rememberOrder } from '@/lib/myOrders'
import Loader from '@/components/ui/loader'
import { normalizeBDPhone } from '@/lib/phone'
import { formatPrice } from '@/lib/money'

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

type PayMethod = 'cod' | 'bkash_manual' | 'nagad_manual' | 'bkash_auto' | 'nagad_auto' | 'crypto_usdt'

type DeliveryZone = { id: string; name: string; charge: number; free_over: number | null }

type AccountType = 'personal' | 'agent' | 'merchant'

type ManualPaymentInfo = {
  provider: 'bkash' | 'nagad'
  number: string
  accountType: AccountType
  amount: number
  reference: string
}

// What the customer taps in their bKash / Nagad app for each account type
const SEND_ACTION: Record<AccountType, string> = {
  personal: 'Send Money',
  agent: 'Cash Out',
  merchant: 'Payment',
}

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
    address: '', city: '', country: 'Bangladesh', zip: '',
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
  const [codEnabled, setCodEnabled] = useState(true)
  const [bkashAuto, setBkashAuto] = useState(false)
  const [nagadAuto, setNagadAuto] = useState(false)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [bkash, setBkash] = useState<{ number: string; type: AccountType } | null>(null)
  const [nagad, setNagad] = useState<{ number: string; type: AccountType } | null>(null)
  const [cryptoResult, setCryptoResult] = useState<CryptoPaymentInfo | null>(null)
  const [copied, setCopied] = useState(false)

  // bKash / Nagad manual payment: instructions screen + Transaction ID form
  const [manualResult, setManualResult] = useState<ManualPaymentInfo | null>(null)
  const [manualOrderId, setManualOrderId] = useState<string | null>(null)
  const [trxId, setTrxId] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [proofSending, setProofSending] = useState(false)
  const [proofSent, setProofSent] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Back from bKash / Nagad without paying
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('payment')
    if (p === 'cancelled') toast.error('Payment was cancelled. You can try again or choose another method.')
    else if (p === 'failed') toast.error('The payment did not go through. Please try again or choose another method.')
  }, [])

  // Delivery areas + charges set by the store owner
  useEffect(() => {
    if (!storeId) return
    supabase
      .from('delivery_zones')
      .select('id, name, charge, free_over')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setZones((data ?? []) as DeliveryZone[]))
  }, [storeId])
  useEffect(() => {
    if (mounted && items.length === 0 && !cryptoResult && !manualResult) router.push('/cart')
  }, [mounted, items.length, router, cryptoResult, manualResult])

  useEffect(() => {
    if (!storeId) return
    supabase
      .from('site_settings')
      .select('crypto_usdt_enabled, cod_enabled, bkash_enabled, bkash_number, bkash_type, nagad_enabled, nagad_number, nagad_type, bkash_auto_enabled, nagad_auto_enabled')
      .eq('store_id', storeId)
      .maybeSingle()
      .then(({ data }) => {
        setCryptoEnabled(!!data?.crypto_usdt_enabled)
        setBkashAuto(!!data?.bkash_auto_enabled)
        setNagadAuto(!!data?.nagad_auto_enabled)
        // A store that hasn't configured anything yet accepts cash on delivery
        setCodEnabled(data ? data.cod_enabled !== false : true)
        setBkash(data?.bkash_enabled && data.bkash_number ? { number: data.bkash_number, type: (data.bkash_type || 'personal') as AccountType } : null)
        setNagad(data?.nagad_enabled && data.nagad_number ? { number: data.nagad_number, type: (data.nagad_type || 'personal') as AccountType } : null)
      })
  }, [storeId])

  if (!mounted || (items.length === 0 && !cryptoResult && !manualResult)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const update = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const cartTotal = total()
  const discountedTotal = appliedCoupon ? appliedCoupon.finalTotal : cartTotal
  const selectedZone = zones.find(z => z.id === zoneId) ?? null
  const deliveryCharge = selectedZone
    ? (selectedZone.free_over !== null && discountedTotal >= Number(selectedZone.free_over) ? 0 : Number(selectedZone.charge))
    : 0
  const finalTotal = discountedTotal + deliveryCharge

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
      toast.success(`Coupon applied! You save ${formatPrice(data.discountAmount)}`)
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
    if (!normalizeBDPhone(form.phone)) {
      toast.error('Please enter a valid mobile number, like 01712345678')
      return
    }
    if (zones.length > 0 && !zoneId) {
      toast.error('Please choose your delivery area')
      return
    }
    setShowMethodModal(true)
  }

  async function processPayment(method: PayMethod) {
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
          deliveryZoneId: zoneId || null,
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
      } else if (method === 'bkash_auto' || method === 'nagad_auto') {
        // Off to bKash / Nagad to pay. The cart stays until the payment is
        // confirmed (the order-success page clears it).
        window.location.href = data.paymentUrl
        return
      } else if (method === 'cod') {
        // Nothing to pay online — straight to the confirmation page
        window.location.href = `/order-success?order=${data.orderId}&method=cod`
      } else {
        // bKash / Nagad: show where to send the money + the Transaction ID form
        setManualResult(data.manual)
        setManualOrderId(data.orderId)
        clearCart()
        setLoading(false)
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

  function copyText(text: string) {
    if (!navigator.clipboard) {
      toast.error('Copy not available here — press and hold the number to copy it.')
      return
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied!')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => toast.error('Copy not available here — press and hold the number to copy it.'))
  }

  async function submitProof(e: React.FormEvent) {
    e.preventDefault()
    if (!manualOrderId) return
    setProofSending(true)
    try {
      const res = await fetch('/api/checkout/payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: manualOrderId, trxId, senderNumber }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save your payment details')
      setProofSent(true)
      toast.success('Payment details received!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save your payment details')
    } finally {
      setProofSending(false)
    }
  }

  // bKash / Nagad order created — show where to send the money.
  if (manualResult) {
    const label = manualResult.provider === 'bkash' ? 'bKash' : 'Nagad'
    return (
      <div className="section-pad pt-28 pb-20 min-h-screen bg-surface-50">
        <div className="container-xl max-w-lg">
          <div className="card p-6 sm:p-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Smartphone size={26} className="text-brand-600" />
              </div>
              <h1 className="font-display text-2xl font-semibold mb-2">Pay with {label}</h1>
              <p className="text-sm text-ink-secondary mb-6">
                Your order is placed. Send the money in your {label} app, then enter the Transaction ID below so the store can confirm it.
              </p>
            </div>

            <div className="bg-surface-50 rounded-2xl p-5 mb-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Amount to send</p>
                <p className="text-2xl font-bold text-ink-primary">{formatPrice(manualResult.amount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">{label} number</p>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-surface-300 p-3">
                  <code className="text-base font-semibold flex-1">{manualResult.number}</code>
                  <button type="button" onClick={() => copyText(manualResult.number)} className="p-2 rounded-lg hover:bg-surface-100 text-ink-secondary shrink-0" aria-label="Copy number">
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-ink-muted mt-1.5">In the app choose <strong>{SEND_ACTION[manualResult.accountType]}</strong>.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Your order reference</p>
                <p className="font-mono font-semibold text-ink-primary">#{manualResult.reference}</p>
                <p className="text-xs text-ink-muted mt-1">If the app asks for a reference, enter this.</p>
              </div>
            </div>

            {proofSent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 mb-6">
                <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">
                  Thank you! The store will check your payment and confirm your order soon. Keep your order reference <strong>#{manualResult.reference}</strong> to track it.
                </p>
              </div>
            ) : (
              <form onSubmit={submitProof} className="space-y-4 mb-6">
                <div>
                  <label className="label">Transaction ID (TrxID)</label>
                  <input required className="input font-mono uppercase" placeholder="e.g. 8N7A6D5EE7" value={trxId}
                    onChange={e => setTrxId(e.target.value.toUpperCase())} maxLength={20} autoComplete="off" />
                  <p className="text-xs text-ink-muted mt-1">You get it in the {label} confirmation message after sending.</p>
                </div>
                <div>
                  <label className="label">Number you sent from</label>
                  <input required type="tel" inputMode="numeric" className="input" placeholder="01XXXXXXXXX" value={senderNumber}
                    onChange={e => setSenderNumber(e.target.value)} />
                </div>
                <button type="submit" disabled={proofSending} className="btn-primary w-full flex items-center justify-center gap-2">
                  {proofSending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {proofSending ? 'Sending…' : 'Submit payment details'}
                </button>
                <p className="text-xs text-ink-muted text-center">
                  Haven&apos;t paid yet? You can come back to this later — the store will contact you on your phone.
                </p>
              </form>
            )}

            <button onClick={() => router.push('/')} className="btn-secondary w-full">
              Return to Store
            </button>
          </div>
        </div>
      </div>
    )
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
                    <input required className="input" placeholder="Your full name" value={form.name} onChange={update('name')} />
                  </div>
                  <div>
                    <label className="label">Email <span className="text-ink-muted font-normal">(optional)</span></label>
                    <input type="email" className="input" placeholder="you@email.com" value={form.email} onChange={update('email')} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Mobile Number</label>
                    <input required type="tel" inputMode="numeric" className="input" placeholder="01XXXXXXXXX" value={form.phone} onChange={update('phone')} />
                    <p className="text-xs text-ink-muted mt-1">The store will call or message you on this number.</p>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="card p-6">
                <h2 className="font-semibold text-lg mb-5">Shipping Address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Full Address</label>
                    <input required className="input" placeholder="House, road, area" value={form.address} onChange={update('address')} />
                  </div>
                  {zones.length > 0 && (
                    <div className="sm:col-span-2">
                      <label className="label">Delivery Area</label>
                      <select required className="input" value={zoneId} onChange={e => setZoneId(e.target.value)}>
                        <option value="">Choose your area…</option>
                        {zones.map(z => (
                          <option key={z.id} value={z.id}>{z.name} — {formatPrice(z.charge)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="label">District / City</label>
                    <input required className="input" placeholder="e.g. Dhaka" value={form.city} onChange={update('city')} />
                  </div>
                  <div>
                    <label className="label">Postal Code <span className="text-ink-muted font-normal">(optional)</span></label>
                    <input className="input" placeholder="e.g. 1207" value={form.zip} onChange={update('zip')} />
                  </div>
                </div>
              </div>

              {/* Payment info */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Lock size={18} className="text-brand-600" />
                  <h2 className="font-semibold text-lg">Payment</h2>
                </div>
                <p className="text-sm text-ink-secondary">
                  You&apos;ll choose how to pay on the next step
                  {[codEnabled && 'Cash on Delivery', (bkash || bkashAuto) && 'bKash', (nagad || nagadAuto) && 'Nagad', cryptoEnabled && 'USDT'].filter(Boolean).length > 0
                    ? ` — ${[codEnabled && 'Cash on Delivery', (bkash || bkashAuto) && 'bKash', (nagad || nagadAuto) && 'Nagad', cryptoEnabled && 'USDT'].filter(Boolean).join(', ')}.`
                    : '.'}
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
                    <span className="font-medium shrink-0">{formatPrice((item.price * item.quantity))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm text-ink-secondary">
                  <span>Delivery{selectedZone ? ` (${selectedZone.name})` : ''}</span>
                  {selectedZone && deliveryCharge > 0
                    ? <span className="font-medium text-ink-primary">{formatPrice(deliveryCharge)}</span>
                    : zones.length > 0 && !selectedZone
                      ? <span className="text-ink-muted">Choose your area</span>
                      : <span className="text-green-600 font-medium">Free</span>}
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
                            : `${formatPrice(appliedCoupon.value)} off`}
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
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Discount</span>
                    <span>−{formatPrice(appliedCoupon.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl pt-1">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>

              <button ref={submitBtnRef} type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Place order · {formatPrice(finalTotal)}
                  </>
                )}
              </button>
              <p className="text-xs text-ink-muted text-center mt-3">
                Your details are sent over a secure (SSL) connection
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
                {bkashAuto && (
                <button
                  onClick={() => processPayment('bkash_auto')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-300 hover:border-brand-600 hover:bg-brand-50/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                    <Smartphone size={20} className="text-ink-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink-primary">Pay with bKash</p>
                    <p className="text-xs text-ink-muted">Pay instantly — confirmed automatically</p>
                  </div>
                </button>
                )}

                {nagadAuto && (
                <button
                  onClick={() => processPayment('nagad_auto')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-300 hover:border-brand-600 hover:bg-brand-50/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                    <Smartphone size={20} className="text-ink-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink-primary">Pay with Nagad</p>
                    <p className="text-xs text-ink-muted">Pay instantly — confirmed automatically</p>
                  </div>
                </button>
                )}

                {codEnabled && (
                <button
                  onClick={() => processPayment('cod')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-300 hover:border-brand-600 hover:bg-brand-50/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                    <Banknote size={20} className="text-ink-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink-primary">Cash on Delivery</p>
                    <p className="text-xs text-ink-muted">Pay in cash when your order arrives</p>
                  </div>
                </button>
                )}

                {bkash && (
                <button
                  onClick={() => processPayment('bkash_manual')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-300 hover:border-brand-600 hover:bg-brand-50/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                    <Smartphone size={20} className="text-ink-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink-primary">bKash</p>
                    <p className="text-xs text-ink-muted">Send money, then enter the TrxID</p>
                  </div>
                </button>
                )}

                {nagad && (
                <button
                  onClick={() => processPayment('nagad_manual')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-surface-300 hover:border-brand-600 hover:bg-brand-50/40 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                    <Smartphone size={20} className="text-ink-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink-primary">Nagad</p>
                    <p className="text-xs text-ink-muted">Send money, then enter the TrxID</p>
                  </div>
                </button>
                )}

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

                {!codEnabled && !bkash && !nagad && !bkashAuto && !nagadAuto && !cryptoEnabled && (
                  <p className="text-sm text-ink-secondary text-center py-4">
                    This store hasn&apos;t turned on a payment method yet. Please contact the store.
                  </p>
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
