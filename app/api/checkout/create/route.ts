import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAdminOrderNotification, sendCustomerConfirmation } from '@/lib/resend'
import { getCurrentStore } from '@/lib/currentStore'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'

function sanitize(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 500)
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  if (!rateLimit(ip, 'checkout', limits.checkout)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes before trying again.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { items, couponCode } = body
    const paymentMethod: 'card' | 'crypto_usdt' = body.paymentMethod === 'crypto_usdt' ? 'crypto_usdt' : 'card'
    // NOTE: total and discountAmount are intentionally NOT destructured from
    // the client here anymore — see the critical fix below.

    const form = {
      name:    sanitize(body.form?.name),
      email:   sanitize(body.form?.email),
      phone:   sanitize(body.form?.phone),
      address: sanitize(body.form?.address),
      city:    sanitize(body.form?.city),
      country: sanitize(body.form?.country),
      zip:     sanitize(body.form?.zip),
    }

    if (!form.name || !form.email || !form.address || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(form.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Which store is this checkout for? Always from the hostname — never
    // from anything in the request body.
    const store = await getCurrentStore()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const db = supabaseAdmin()

    // If crypto was requested, fetch the admin's configured USDT details
    // up front and reject before doing any other work if it isn't actually
    // enabled/configured — prevents an order being created for a payment
    // method that has nowhere for the customer to actually send funds to.
    let cryptoConfig: { address: string; network: string } | null = null
    if (paymentMethod === 'crypto_usdt') {
      const { data: settings } = await db
        .from('site_settings')
        .select('crypto_usdt_enabled, crypto_usdt_address, crypto_usdt_network')
        .eq('store_id', store.id)
        .maybeSingle()

      if (!settings?.crypto_usdt_enabled || !settings.crypto_usdt_address) {
        return NextResponse.json({ error: 'Crypto payment is not currently available' }, { status: 400 })
      }
      cryptoConfig = { address: settings.crypto_usdt_address, network: settings.crypto_usdt_network || 'TRC20' }
    }

    // ════════════════════════════════════════════════════════════════════
    // ⚠️ CRITICAL SECURITY FIX
    // The previous version trusted `total` and `discountAmount` directly
    // from the request body and saved them as-is. Anyone could intercept
    // the checkout request and send total: 0.01 to buy any product for a
    // penny. We now NEVER trust client-sent prices — every item's real
    // price is re-fetched from the database, and the total + any coupon
    // discount are recalculated entirely server-side.
    // ════════════════════════════════════════════════════════════════════

    const itemIds = items
      .map((i: { id: string }) => i?.id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)

    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'No valid items in cart' }, { status: 400 })
    }

    const { data: dbProducts, error: productsError } = await db
      .from('products')
      .select('id, name, price, stock_status')
      .eq('store_id', store.id)
      .in('id', itemIds)

    if (productsError || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ error: 'Unable to verify cart items' }, { status: 400 })
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]))

    // Rebuild the cart server-side using only verified DB prices and
    // client-claimed quantities (quantity manipulation only affects how
    // much of a real product you get, not the per-unit price — and we
    // still cap it to something sane below).
    let subtotal = 0
    const lineItems: { name: string; quantity: number; price: number }[] = []

    for (const clientItem of items) {
      const dbProduct = productMap.get(clientItem.id)
      if (!dbProduct) {
        return NextResponse.json({ error: 'One or more items in your cart are no longer available' }, { status: 400 })
      }
      if (dbProduct.stock_status === 'out_of_stock') {
        return NextResponse.json({ error: `${dbProduct.name} is currently out of stock` }, { status: 400 })
      }

      const quantity = Math.max(1, Math.min(50, parseInt(clientItem.quantity) || 1))
      const lineTotal = dbProduct.price * quantity
      subtotal += lineTotal

      lineItems.push({ name: dbProduct.name, quantity, price: dbProduct.price })
    }

    subtotal = parseFloat(subtotal.toFixed(2))

    // Validate + apply coupon server-side — never trust a client-sent discount amount
    let discountAmount = 0
    let appliedCouponCode: string | null = null

    if (couponCode && typeof couponCode === 'string') {
      const { data: coupon } = await db
        .from('coupons')
        .select('*')
        .eq('store_id', store.id)
        .eq('code', couponCode.trim().toUpperCase())
        .single()

      const now = new Date()
      const isValid = coupon
        && coupon.is_active
        && (!coupon.expires_at || new Date(coupon.expires_at) >= now)
        && (coupon.usage_limit === null || coupon.usage_count < coupon.usage_limit)
        && (!coupon.min_order || subtotal >= coupon.min_order)

      if (isValid) {
        discountAmount = coupon.type === 'percentage'
          ? parseFloat(((subtotal * coupon.value) / 100).toFixed(2))
          : Math.min(coupon.value, subtotal)
        appliedCouponCode = coupon.code
      }
      // If invalid for any reason, silently ignore the coupon rather than
      // failing the whole checkout — the customer already saw it applied
      // (or not) at the cart step; this is just the final authoritative check.
    }

    const finalTotal = parseFloat((subtotal - discountAmount).toFixed(2))

    const productName = lineItems.map(i => `${i.name} × ${i.quantity}`).join(', ')
    const totalQuantity = lineItems.reduce((s, i) => s + i.quantity, 0)

    const { data: order, error } = await db
      .from('orders')
      .insert({
        store_id:         store.id,
        customer_name:    form.name,
        customer_email:   form.email,
        customer_phone:   form.phone,
        customer_address: form.address,
        customer_city:    form.city,
        customer_country: form.country,
        customer_zip:     form.zip,
        product_id:       itemIds[0] ?? 'multi',
        product_name:     productName,
        quantity:         totalQuantity,
        total_price:      finalTotal,
        payment_status:   'pending',
        payment_method:   paymentMethod,
        crypto_amount:    paymentMethod === 'crypto_usdt' ? finalTotal : null,
        crypto_network:   cryptoConfig?.network ?? null,
        order_status:     'processing',
        coupon_code:      appliedCouponCode,
        discount_amount:  discountAmount,
      })
      .select()
      .single()

    if (error) throw error

    if (appliedCouponCode) {
      const { data: coupon } = await db
        .from('coupons')
        .select('usage_count')
        .eq('store_id', store.id)
        .eq('code', appliedCouponCode)
        .single()

      if (coupon) {
        await db
          .from('coupons')
          .update({ usage_count: coupon.usage_count + 1 })
          .eq('store_id', store.id)
          .eq('code', appliedCouponCode)
      }
    }

    try {
      await Promise.all([
        sendAdminOrderNotification(order),
        sendCustomerConfirmation(order),
      ])
    } catch (emailErr) {
      console.error('Order created but email failed to send:', emailErr)
    }

    if (paymentMethod === 'crypto_usdt' && cryptoConfig) {
      return NextResponse.json({
        orderId: order.id,
        crypto: {
          currency: 'USDT',
          network:  cryptoConfig.network,
          address:  cryptoConfig.address,
          amount:   finalTotal,
          reference: order.id.slice(0, 8).toUpperCase(),
        },
      })
    }

    const sellerId  = process.env.TWOCHECKOUT_SELLER_ID
    // Send the customer back to THIS store's own address (already verified
    // above via getCurrentStore), not one global URL.
    const reqHost  = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const reqProto = req.headers.get('x-forwarded-proto') || 'https'
    const appUrl    = reqHost ? `${reqProto}://${reqHost}` : process.env.NEXT_PUBLIC_APP_URL
    const returnUrl = encodeURIComponent(`${appUrl}/order-success?order=${order.id}`)
    const cancelUrl = encodeURIComponent(`${appUrl}/checkout`)

    const paymentUrl =
      `https://secure.2checkout.com/order/checkout.php` +
      `?PRODS=` + itemIds.join(',') +
      `&QTY=` + lineItems.map(i => i.quantity).join(',') +
      `&COUPON=&CART=1&CARD=1` +
      `&BACK_REF=${returnUrl}` +
      `&CANCEL_URL=${cancelUrl}` +
      `&ORDERFLD_orderId=${order.id}` +
      `&CURRENCY=USD` +
      `&LANGUAGE=en` +
      `&SID=${sellerId}`

    return NextResponse.json({ paymentUrl, orderId: order.id })
  } catch (err: unknown) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create order' },
      { status: 500 }
    )
  }
}
