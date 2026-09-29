import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAdminOrderNotification, sendCustomerConfirmation } from '@/lib/resend'
import { createHash, timingSafeEqual } from 'crypto'

// ⚠️ CRITICAL SECURITY FIX
// The old version of this route trusted ANY request body completely with
// no verification. Anyone who knew or guessed an orderId could POST here
// directly and mark unpaid orders as "paid" for free — no actual payment
// gateway involvement required. This is now fixed with signature verification.

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// 2Checkout / Verifone signs webhook payloads as:
// MD5(secretKey + orderId + total + customerEmail) — adjust field order/hash
// to match whatever your actual gateway's docs specify once you finalize
// which gateway you're using. This function isolates that logic in one place.
function verifySignature(body: Record<string, unknown>): boolean {
  const secret = process.env.TWOCHECKOUT_SECRET_KEY
  if (!secret) {
    // No secret configured — refuse to process any webhook rather than
    // silently trusting unverified input. Fail closed, not open.
    console.error('Webhook rejected: TWOCHECKOUT_SECRET_KEY is not configured')
    return false
  }

  const providedSig = String(body.signature ?? body.HASH ?? '')
  if (!providedSig) return false

  const orderId = String(body.ORDERFLD_orderId ?? body.orderId ?? '')
  const ref     = String(body.REFNO ?? body.reference ?? '')

  const expectedSig = createHash('md5')
    .update(`${secret}${orderId}${ref}`)
    .digest('hex')

  return safeCompare(providedSig, expectedSig)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Reject the request entirely if we cannot verify it came from the
    // real payment gateway. This is the core fix — fail closed by default.
    if (!verifySignature(body)) {
      console.error('Webhook rejected: invalid or missing signature', {
        ip: req.headers.get('x-forwarded-for'),
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const orderId = body.ORDERFLD_orderId || body.orderId
    const ref     = body.REFNO || body.reference

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Only transition orders that are still pending — prevents a replayed
    // or duplicate webhook call from re-triggering emails on an order
    // that's already been marked paid.
    const { data: existing } = await db
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (existing.payment_status === 'paid') {
      // Already processed — acknowledge without re-sending emails
      return NextResponse.json({ ok: true, alreadyProcessed: true })
    }

    const { data: order, error } = await db
      .from('orders')
      .update({
        payment_status:  'paid',
        order_status:    'processing',
        twocheckout_ref: typeof ref === 'string' ? ref : null,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error || !order) throw error || new Error('Order not found')

    await Promise.all([
      sendAdminOrderNotification(order),
      sendCustomerConfirmation(order),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
