# Elyvate — Setup Guide

## 1. Clone & Install
```bash
npm install
```

## 2. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in all values:
```bash
cp .env.local.example .env.local
```

## 3. Supabase Setup
1. Go to your Supabase project → SQL Editor → New Query
2. Paste the entire contents of `supabase-schema.sql` and run it
3. Go to Storage → New Bucket → Name: `product-images` → Public: ON

## 4. Get Your Supabase Keys
- Project URL → Settings → API → Project URL
- Anon Key → Settings → API → anon public
- Service Role Key → Settings → API → service_role secret

## 4a. Admin Panel Login (IMPORTANT)
Set `ADMIN_SECRET` in your `.env.local` (and in Vercel env vars) to a strong password — this is the password you'll use to log into `/rafiixr`.

```env
ADMIN_SECRET=choose_a_strong_password_here
```

Visit `/rafiixr` → you'll be redirected to `/rafiixr-login` → enter your `ADMIN_SECRET` value as the password.
(The admin URL is deliberately obscured from `/admin` to `/rafiixr` to avoid automated bot scanning.)

## 4b. Storage Bucket (REQUIRED for image uploads)
1. Supabase Dashboard → Storage → **New Bucket**
2. Name it exactly: `product-images`
3. Toggle **Public bucket: ON**
4. Click Create

Without this bucket, image uploads in the admin panel will fail.

## 5. Resend Setup
1. Sign up at resend.com (free)
2. Add your domain or use their test email
3. Get your API key from dashboard
4. Set RESEND_FROM_EMAIL and ADMIN_EMAIL

## 6. 2Checkout Setup
1. Sign up at 2checkout.com
2. Get Seller ID and Secret Key from dashboard
3. Set webhook URL to: `https://yourdomain.com/api/checkout/webhook`

## 7. Run Locally
```bash
npm run dev
```
Open http://localhost:3000

## 8. Admin Panel
Visit http://localhost:3000/rafiixr

## 9. Deploy to Vercel
1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy!

## Pages
| URL | Description |
|-----|-------------|
| / | Homepage |
| /products | All products |
| /products/[slug] | Product detail |
| /cart | Shopping cart |
| /checkout | Checkout |
| /order-success | Order confirmation |
| /rafiixr | Admin dashboard |
| /rafiixr/products | Manage products |
| /rafiixr/orders | View & update orders |
| /rafiixr/hero | Edit hero section |
| /rafiixr/settings | Store settings |
