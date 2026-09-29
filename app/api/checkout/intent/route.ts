import { NextRequest, NextResponse } from 'next/server'
import { sendCheckoutIntentNotification } from '@/lib/resend'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'
import { getCurrentStore } from '@/lib/currentStore'

// Fires when a customer clicks "Checkout" on the cart page —
// fire-and-forget: never blocks the customer from proceeding to checkout.
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  // Reuses the checkout limit (5 per 10 min) — this is a pre-checkout signal,
  // so it should never fire more often than real checkout attempts would.
  if (!rateLimit(ip, 'checkout-intent', limits.checkout)) {
    return NextResponse.json({ ok: false }, { status: 200 }) // fail silently, never block UX
  }

  try {
    const { items, total, customerEmail } = await req.json()

    if (!Array.isArray(items) || items.length === 0 || items.length > 50 || typeof total !== 'number' || total < 0 || total > 1000000) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const store = await getCurrentStore()
    if (!store) return NextResponse.json({ ok: false }, { status: 200 })

    await sendCheckoutIntentNotification({ items, total, customerEmail: customerEmail ?? null, storeId: store.id })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Checkout intent email failed:', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
