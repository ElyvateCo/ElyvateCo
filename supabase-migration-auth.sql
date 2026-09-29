-- =============================================
-- ELYVATE — Auth Migration
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

-- Allow logged-in users to read their own orders (by email)
-- The existing "Anyone can create orders" policy stays as-is for guests
create policy "Users can read own orders"
  on orders for select
  using (customer_email = auth.jwt() ->> 'email');

-- =============================================
-- SUPABASE DASHBOARD STEPS (do these manually)
-- =============================================
-- 1. Go to Authentication → Providers → Email
--    • Turn OFF "Confirm email" (so no verification email is sent)
--    • Save
--
-- 2. Go to Authentication → Providers → Google
--    • Enable Google provider
--    • Add your Google OAuth Client ID and Secret
--    • (Get these from console.cloud.google.com → APIs & Services → Credentials)
--    • Authorized redirect URI to add in Google Console:
--      https://<your-supabase-project>.supabase.co/auth/v1/callback
--    • Save
-- =============================================
