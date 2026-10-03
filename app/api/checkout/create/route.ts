import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAdminOrderNotification, sendCustomerConfirmation } from '@/lib/resend'
import { getCurrentStore } from '@/lib/currentStore'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'
import { normalizeBDPhone } from '@/lib/phone'
import { getRequestOrigin } from '@/lib/requestOrigin'
import { loadGatewayCreds } from '@/lib/gateways/credentials'
import { bkashCreatePayment, type BkashCreds } from '@/lib/gateways/bkash'
import { nagadCreatePayment, type NagadCreds } from '@/lib/gateways/nagad'

const PAYMENT_METHODS = ['cod', 'bkash_manual', 'nagad_manual', 'bkash_auto', 'nagad_auto', 'crypto_usdt'] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

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
    const paymentMethod = PAYMENT_METHODS.find(m => m === body.paymentMethod) as PaymentMethod | undefined
    if (!paymentMethod) {
      return NextResponse.json({ error: 'Please choose a payment method' }, { status: 400 })
    }
    // NOTE: total and discountAmount are intentionally NOT destructured from
    // the client here anymore — see the critical fix below.

    const form = {
      name:    sanitize(body.form?.name),
      email:   sanitize(body.form?.email),
      phone:   normalizeBDPhone(sanitize(body.form?.phone)) ?? '',
      address: sanitize(body.form?.address),
      city:    sanitize(body.form?.city),
      country: sanitize(body.form?.country) || 'Bangladesh',
      zip:     sanitize(body.form?.zip),
    }

    // Phone number is how the store reaches the customer (Bangladesh is
    // phone-first); email is optional.
    if (!form.name || !form.address || !form.city || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!form.phone) {
      return NextResponse.json({ error: 'Please enter a valid mobile number, like 01712345678' }, { status: 400 })
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (form.email && !emailPattern.test(form.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Which store is this checkout for? Always from the hostname — never
    // from anything in the request body.
    const store = await getCurrentStore()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const db = supabaseAdmin()

    // Only allow payment methods this store has actually switched on, and
    // read the receiving numbers/addresses from the DATABASE — never from
    // the request — so a customer can't point money at anyone else.
    const { data: settings } = await db
      .from('site_settings')
      .select('cod_enabled, bkash_enabled, bkash_number, bkash_type, nagad_enabled, nagad_number, nagad_type, bkash_auto_enabled, nagad_auto_enabled, crypto_usdt_enabled, crypto_usdt_address, crypto_usdt_network')
      .eq('store_id', store.id)
      .maybeSingle()

    let cryptoConfig: { address: string; network: string } | null = null
    let manualWallet: { provider: 'bkash' | 'nagad'; number: string; accountType: string } | null = null
    let autoProvider: 'bkash' | 'nagad' | null = null

    if (paymentMethod === 'cod') {
      // A store with no settings yet accepts cash on delivery by default
      if (settings && settings.cod_enabled === false) {
        return NextResponse.json({ error: 'Cash on delivery is not available at this store' }, { status: 400 })
      }
    } else if (paymentMethod === 'bkash_manual') {
      if (!settings?.bkash_enabled || !settings.bkash_number) {
        return NextResponse.json({ error: 'bKash payment is not available at this store' }, { status: 400 })
      }
      manualWallet = { provider: 'bkash', number: settings.bkash_number, accountType: settings.bkash_type || 'personal' }
    } else if (paymentMethod === 'nagad_manual') {
      if (!settings?.nagad_enabled || !settings.nagad_number) {
        return NextResponse.json({ error: 'Nagad payment is not available at this store' }, { status: 400 })
      }
      manualWallet = { provider: 'nagad', number: settings.nagad_number, accountType: settings.nagad_type || 'personal' }
    } else if (paymentMethod === 'bkash_auto' || paymentMethod === 'nagad_auto') {
      const provider = paymentMethod === 'bkash_auto' ? 'bkash' : 'nagad'
      const on = provider === 'bkash' ? settings?.bkash_auto_enabled : settings?.nagad_auto_enabled
      if (!on) {
        return NextResponse.json({ error: `Online ${provider === 'bkash' ? 'bKash' : 'Nagad'} payment is not available at this store` }, { status: 400 })
      }
      autoProvider = provider
    } else if (paymentMethod === 'crypto_usdt') {
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

    // Delivery charge comes from the store's delivery zones — decided HERE,
    // never taken from the browser. A store with no zones delivers free.
    const { data: zones } = await db
      .from('delivery_zones')
      .select('id, name, charge, free_over')
      .eq('store_id', store.id)
      .eq('is_active', true)
    let deliveryCharge = 0
    let deliveryZoneName: string | null = null
    if (zones && zones.length > 0) {
      const zone = zones.find(z => z.id === body.deliveryZoneId)
      if (!zone) {
        return NextResponse.json({ error: 'Please choose your delivery area' }, { status: 400 })
      }
      const afterDiscount = subtotal - discountAmount
      deliveryCharge = zone.free_over !== null && zone.free_over !== undefined && afterDiscount >= Number(zone.free_over)
        ? 0
        : Number(zone.charge)
      deliveryZoneName = zone.name
    }

    const finalTotal = parseFloat((subtotal - discountAmount + deliveryCharge).toFixed(2))

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
        delivery_charge:  deliveryCharge,
        delivery_zone:    deliveryZoneName,
      })
      .select()
      .single()

    if (error) throw error

    // Automatic bKash / Nagad: ask the gateway for a payment link BEFORE
    // anything else is counted. If it fails the order is cancelled, so the
    // customer can simply try another method.
    let autoPaymentUrl: string | null = null
    if (autoProvider) {
      try {
        const origin = getRequestOrigin(req)
        const callbackURL = `${origin}/api/payments/${autoProvider}/callback?order=${order.id}`
        if (autoProvider === 'bkash') {
          const loaded = await loadGatewayCreds<BkashCreds>(store.id, 'bkash')
          if (!loaded) throw new Error('bKash is not connected for this store')
          const pay = await bkashCreatePayment(loaded.creds, loaded.mode, {
            amount: finalTotal,
            invoice: order.id.replace(/-/g, '').slice(0, 20),
            callbackURL,
            payerReference: form.phone,
          })
          await db.from('orders').update({ gateway_payment_id: pay.paymentID }).eq('id', order.id)
          autoPaymentUrl = pay.bkashURL
        } else {
          const loaded = await loadGatewayCreds<NagadCreds>(store.id, 'nagad')
          if (!loaded) throw new Error('Nagad is not connected for this store')
          const pay = await nagadCreatePayment(loaded.creds, loaded.mode, {
            orderUuid: order.id,
            amount: finalTotal,
            callbackURL,
            ip: getIP(req),
          })
          await db.from('orders').update({ gateway_payment_id: pay.paymentRefId }).eq('id', order.id)
          autoPaymentUrl = pay.redirectUrl
        }
      } catch (gatewayErr) {
        console.error('Gateway start failed:', gatewayErr)
        await db.from('orders').update({ payment_status: 'failed', order_status: 'cancelled' }).eq('id', order.id)
        return NextResponse.json(
          { error: 'We could not start the online payment. Please try another payment method.' },
          { status: 502 }
        )
      }
    }

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

    // Online-paid orders are announced only once the payment is confirmed
    // (see /api/payments/*/callback); everything else is announced now.
    if (!autoProvider) try {
      await Promise.all([
        sendAdminOrderNotification(order),
        // Email is optional at checkout — only email customers who gave one
        order.customer_email ? sendCustomerConfirmation(order) : Promise.resolve(),
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

    if (autoPaymentUrl) {
      return NextResponse.json({ orderId: order.id, paymentUrl: autoPaymentUrl })
    }

    if (manualWallet) {
      return NextResponse.json({
        orderId: order.id,
        manual: {
          provider:    manualWallet.provider,
          number:      manualWallet.number,
          accountType: manualWallet.accountType,
          amount:      finalTotal,
          reference:   order.id.slice(0, 8).toUpperCase(),
        },
      })
    }

    // Cash on delivery — nothing more to do online
    return NextResponse.json({ orderId: order.id, cod: true })
  } catch (err: unknown) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create order' },
      { status: 500 }
    )
  }
}
