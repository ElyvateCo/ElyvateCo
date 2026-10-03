import { formatPrice } from '@/lib/money'
import { Resend } from 'resend'
import { Order, supabaseAdmin } from './supabase'
import { THEME_PRESETS, DEFAULT_THEME_PRESET, isThemePresetKey, isValidHex } from './themePresets'

// Lazily create the client inside each call instead of at module load time.
// Creating it at the top of the file can run before Vercel's env vars are
// guaranteed to be attached, causing silent auth failures.
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing — check Vercel Environment Variables')
  }
  return new Resend(apiKey)
}

// Emails are static HTML sent at send-time — they have no access to the
// site's CSS variables, so without this they'd stay hardcoded to whichever
// color was on the site when this file was written. This looks up whatever
// theme is currently active in the admin panel so the emails stay visually
// consistent with the live storefront.
export async function getBrandColor(storeId?: string | null): Promise<string> {
  try {
    if (!storeId) return THEME_PRESETS[DEFAULT_THEME_PRESET].hex
    const db = supabaseAdmin()
    const { data } = await db.from('site_settings').select('theme_preset, custom_theme_hex').eq('store_id', storeId).maybeSingle()
    if (data?.theme_preset === 'custom' && isValidHex(data?.custom_theme_hex)) {
      return data.custom_theme_hex.startsWith('#') ? data.custom_theme_hex : `#${data.custom_theme_hex}`
    }
    const preset = isThemePresetKey(data?.theme_preset) ? data!.theme_preset : DEFAULT_THEME_PRESET
    return THEME_PRESETS[preset].hex
  } catch {
    return THEME_PRESETS[DEFAULT_THEME_PRESET].hex
  }
}

// Each store's notifications go to THAT store's owner (their login email),
// and emails carry that store's own name — no more single hardcoded
// ADMIN_EMAIL / "Elyvate" for every store on the platform.
export async function getStoreEmailContext(storeId?: string | null): Promise<{ storeName: string; ownerEmail: string | null }> {
  if (!storeId) return { storeName: 'Store', ownerEmail: null }
  const db = supabaseAdmin()
  const { data: store } = await db.from('stores').select('store_name, owner_user_id').eq('id', storeId).maybeSingle()
  let ownerEmail: string | null = null
  if (store?.owner_user_id) {
    const { data } = await db.auth.admin.getUserById(store.owner_user_id)
    ownerEmail = data?.user?.email ?? null
  }
  return { storeName: store?.store_name ?? 'Store', ownerEmail }
}

export async function sendAdminOrderNotification(order: Order) {
  const resend = getResendClient()
  const fromEmail  = process.env.RESEND_FROM_EMAIL
  const { storeName, ownerEmail: adminEmail } = await getStoreEmailContext(order.store_id)
  const brandColor = await getBrandColor(order.store_id)

  if (!fromEmail) throw new Error('RESEND_FROM_EMAIL is missing in env vars')
  if (!adminEmail) throw new Error('This store has no owner email to notify')

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `🛒 New Order #${order.id.slice(0, 8).toUpperCase()} — ${order.product_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${brandColor};">New Order Received — ${storeName}</h2>
        <p>You have a new order that needs to be fulfilled on CJ Dropshipping.</p>

        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">Order ID</td>
            <td style="padding:10px;">#${order.id.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:10px; font-weight:bold;">Product</td>
            <td style="padding:10px;">${order.product_name}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">Quantity</td>
            <td style="padding:10px;">${order.quantity}</td>
          </tr>
          <tr>
            <td style="padding:10px; font-weight:bold;">Total Paid</td>
            <td style="padding:10px;">${formatPrice(order.total_price)}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">Payment Method</td>
            <td style="padding:10px;">
              ${order.payment_method === 'crypto_usdt'
                ? `⚠️ USDT (${order.crypto_network ?? 'crypto'}) — <strong>check your exchange account and mark as Paid manually in the admin panel</strong>`
                : 'Card'}
            </td>
          </tr>
        </table>

        <h3 style="color: #333;">📦 Ship To:</h3>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">Name</td>
            <td style="padding:10px;">${order.customer_name}</td>
          </tr>
          <tr>
            <td style="padding:10px; font-weight:bold;">Email</td>
            <td style="padding:10px;">${order.customer_email}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">Phone</td>
            <td style="padding:10px;">${order.customer_phone}</td>
          </tr>
          <tr>
            <td style="padding:10px; font-weight:bold;">Address</td>
            <td style="padding:10px;">${order.customer_address}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">City</td>
            <td style="padding:10px;">${order.customer_city}</td>
          </tr>
          <tr>
            <td style="padding:10px; font-weight:bold;">Country</td>
            <td style="padding:10px;">${order.customer_country}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">ZIP</td>
            <td style="padding:10px;">${order.customer_zip}</td>
          </tr>
        </table>

        <p style="background:#fff3cd; padding:12px; border-radius:8px;">
          ⚡ <strong>Action Required:</strong> Log into CJ Dropshipping and place this order manually using the customer address above.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/go-admin?to=orders" 
           style="display:inline-block; background:${brandColor}; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; margin-top:10px;">
          View in Admin Panel
        </a>
      </div>
    `,
  })

  if (error) {
    console.error('Resend failed to send admin notification:', error)
    throw new Error(error.message)
  }
  return data
}

export async function sendCustomerConfirmation(order: Order) {
  const resend = getResendClient()
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const { storeName } = await getStoreEmailContext(order.store_id)
  const brandColor = await getBrandColor(order.store_id)
  if (!fromEmail) throw new Error('RESEND_FROM_EMAIL is missing in env vars')

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: order.customer_email,
    subject: `✨ Order Confirmed — ${storeName} #${order.id.slice(0, 8).toUpperCase()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${brandColor};">Thank you for your order, ${order.customer_name}!</h2>
        <p>We've received your order and it's being processed. You'll receive a shipping update soon.</p>

        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">Order ID</td>
            <td style="padding:10px;">#${order.id.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:10px; font-weight:bold;">Product</td>
            <td style="padding:10px;">${order.product_name}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:10px; font-weight:bold;">Quantity</td>
            <td style="padding:10px;">${order.quantity}</td>
          </tr>
          <tr>
            <td style="padding:10px; font-weight:bold;">Total</td>
            <td style="padding:10px;">${formatPrice(order.total_price)}</td>
          </tr>
        </table>

        <p>Estimated delivery: <strong>7–14 business days</strong></p>
        <p style="color:#555;">If you have any questions, reply to this email and we'll help you out.</p>

        <p style="margin-top:30px; color:#999; font-size:12px;">
          © ${new Date().getFullYear()} ${storeName}. All rights reserved.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Resend failed to send customer confirmation:', error)
    throw new Error(error.message)
  }
  return data
}

// ─── NEW: Checkout Intent Notification ─────────────────────────────────────
// Fires the moment a customer clicks "Checkout" on the cart page —
// before they've filled in any details or paid. Lets you know someone
// is actively about to buy, in real time.
type CheckoutIntentPayload = {
  items: { name: string; price: number; quantity: number }[]
  total: number
  customerEmail?: string | null // only available if the user is logged in
  storeId: string
}

export async function sendCheckoutIntentNotification(payload: CheckoutIntentPayload) {
  const resend = getResendClient()
  const fromEmail  = process.env.RESEND_FROM_EMAIL
  const { ownerEmail: adminEmail } = await getStoreEmailContext(payload.storeId)
  const brandColor = await getBrandColor(payload.storeId)
  if (!fromEmail) throw new Error('RESEND_FROM_EMAIL is missing in env vars')
  if (!adminEmail) throw new Error('This store has no owner email to notify')

  const itemsHtml = payload.items.map(i => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:8px 0;">${i.name} × ${i.quantity}</td>
      <td style="padding:8px 0; text-align:right;">${formatPrice((i.price * i.quantity))}</td>
    </tr>
  `).join('')

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `👀 Someone is checking out right now — ${formatPrice(payload.total)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${brandColor};">🔥 Live Checkout Started</h2>
        <p>A visitor just clicked <strong>Checkout</strong> on your store. They haven't paid yet, but here's what's in their cart:</p>

        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          ${itemsHtml}
          <tr>
            <td style="padding:10px 0; font-weight:bold;">Total</td>
            <td style="padding:10px 0; text-align:right; font-weight:bold;">${formatPrice(payload.total)}</td>
          </tr>
        </table>

        ${payload.customerEmail ? `<p style="color:#555;">Logged in as: <strong>${payload.customerEmail}</strong></p>` : `<p style="color:#999; font-size:13px;">Visitor is browsing as a guest — no email yet until they complete the form.</p>`}

        <p style="background:#f5f5f5; padding:12px; border-radius:8px; color:#555; font-size:13px;">
          This is just a heads-up — no action needed unless they complete the order.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Resend failed to send checkout intent notification:', error)
    throw new Error(error.message)
  }
  return data
}
