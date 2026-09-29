'use client'
import { useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Package, Mail } from 'lucide-react'
import { useCart } from '@/lib/cartStore'
import { rememberOrder } from '@/lib/myOrders'

export const dynamic = 'force-dynamic'

function OrderSuccessContent() {
  const { clearCart } = useCart()
  const searchParams  = useSearchParams()
  const orderId       = searchParams.get('order')
  const shortId       = orderId ? orderId.slice(0, 8).toUpperCase() : null

  useEffect(() => {
    clearCart()
    // Safety net alongside the checkout page's own rememberOrder call — in
    // case this order ID reaches the customer via a different path than
    // the normal in-app flow (e.g. a bookmarked/shared confirmation link).
    if (orderId) rememberOrder(orderId)
  }, [orderId])

  return (
    <div className="text-center max-w-md">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} className="text-green-600" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink-primary mb-3">Order Confirmed!</h1>
      {shortId && (
        <div className="bg-surface-50 rounded-2xl px-5 py-3 mb-4 inline-block">
          <p className="text-xs text-ink-muted mb-0.5">Your Order ID</p>
          <p className="font-mono font-bold text-ink-primary text-xl">#{shortId}</p>
          <p className="text-xs text-ink-muted mt-0.5">Save this to track your order</p>
        </div>
      )}
      <p className="text-ink-secondary leading-relaxed mb-8">
        Thank you for your purchase! A confirmation email has been sent to you. Your order will be processed within 1–3 business days.
      </p>
      <div className="flex flex-col gap-3">
        <Link href="/track-order" className="btn-primary flex items-center justify-center gap-2">
          <Package size={16} /> Track My Order
        </Link>
        <Link href="/products" className="btn-secondary">Continue Shopping</Link>
      </div>
      <div className="flex items-center justify-center gap-2 mt-8 text-xs text-ink-muted">
        <Mail size={13} /> Confirmation sent to your email
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center section-pad pt-28 pb-20">
      <Suspense fallback={
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }>
        <OrderSuccessContent />
      </Suspense>
    </div>
  )
}
