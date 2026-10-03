import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rateLimit, getIP, limits } from '@/lib/rateLimit'
import { supabaseAdmin } from '@/lib/supabase'
import { getBrandColor, getStoreEmailContext } from '@/lib/resend'
import { getCurrentStore } from '@/lib/currentStore'

function sanitize(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLen)
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  if (!rateLimit(ip, 'contact', limits.contact)) {
    return NextResponse.json({ error: 'Too many messages sent. Please try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const name    = sanitize(body.name, 100)
    const email   = sanitize(body.email, 150)
    const orderId = sanitize(body.orderId, 30)
    const message = sanitize(body.message, 2000)

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Save the message first — this is now the source of truth that shows
    // up in the admin panel. Previously this route only ever sent emails,
    // so a message existed nowhere durable: if RESEND_API_KEY wasn't set,
    // or the email silently failed to deliver, the message was gone
    // forever with no record anywhere, even though the customer was told
    // it succeeded.
    const store = await getCurrentStore()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const db = supabaseAdmin()
    const { error: dbError } = await db.from('contact_messages').insert({
      store_id: store.id,
      name,
      email,
      order_id: orderId || null,
      message,
    })

    if (dbError) {
      console.error('Contact message DB insert failed:', dbError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Email notifications are a best-effort convenience on top of the saved
    // record above — if these fail, the message is still safely stored and
    // visible in the admin panel, so we don't fail the whole request over it.
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      const resend  = new Resend(process.env.RESEND_API_KEY)
      const appUrl  = process.env.NEXT_PUBLIC_APP_URL
      const fromEmail = process.env.RESEND_FROM_EMAIL
      const brandColor = await getBrandColor(store.id)
      const { ownerEmail } = await getStoreEmailContext(store.id)

      try {
        // Email to you (store owner)
        const adminSend = await resend.emails.send({
          from:    fromEmail,
          to:      ownerEmail ?? 'support@elyvate.com',
          subject: `New Contact Message from ${name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#1a1a1a">New Contact Message</h2>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px;color:#666;width:120px">Name</td><td style="padding:8px;font-weight:600">${name}</td></tr>
                <tr style="background:#f8f8f8"><td style="padding:8px;color:#666">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
                ${orderId ? `<tr><td style="padding:8px;color:#666">Order ID</td><td style="padding:8px;font-family:monospace">#${orderId.toUpperCase()}</td></tr>` : ''}
                <tr style="background:#f8f8f8"><td style="padding:8px;color:#666;vertical-align:top">Message</td><td style="padding:8px">${message.replace(/\n/g, '<br/>')}</td></tr>
              </table>
              <a href="${appUrl}/go-admin?to=contact" style="display:inline-block;background:${brandColor};color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">View in Admin Panel</a>
            </div>
          `,
        })
        if (adminSend.error) console.error('Contact admin-notify email failed:', adminSend.error)

        // Auto-reply to customer
        const customerSend = await resend.emails.send({
          from:    fromEmail,
          to:      email,
          subject: `We received your message — ${store.store_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#1a1a1a">Thanks for reaching out, ${name}!</h2>
              <p style="color:#666">We've received your message and will get back to you within 24 hours.</p>
              <div style="background:#f8f8f8;border-radius:12px;padding:16px;margin:20px 0">
                <p style="margin:0;color:#888;font-size:13px">Your message:</p>
                <p style="margin:8px 0 0;color:#333">${message.replace(/\n/g, '<br/>')}</p>
              </div>
              <p style="color:#999;font-size:13px">— The ${store.store_name} Team</p>
              <p style="color:#ccc;font-size:12px;margin-top:32px">© ${new Date().getFullYear()} Elyvate · <a href="${appUrl}" style="color:#ccc">elyvate.com</a></p>
            </div>
          `,
        })
        if (customerSend.error) console.error('Contact auto-reply email failed:', customerSend.error)
      } catch (emailErr) {
        // Never let an email-sending crash undo the fact that the message
        // was already safely saved above.
        console.error('Contact email sending threw:', emailErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
