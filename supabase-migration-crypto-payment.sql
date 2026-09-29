-- =============================================
-- MIGRATION: Add crypto (USDT) payment support
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

alter table orders
  add column if not exists payment_method text not null default 'card' check (payment_method in ('card', 'crypto_usdt')),
  add column if not exists crypto_amount  numeric(10,2),
  add column if not exists crypto_network text;

alter table site_settings
  add column if not exists crypto_usdt_enabled boolean default false,
  add column if not exists crypto_usdt_address text default '',
  add column if not exists crypto_usdt_network text default 'TRC20';

-- Payment is verified MANUALLY (matching your existing bank-transfer
-- workflow) — an admin checks their Binance/Bybit account for the incoming
-- transaction and marks the order paid in /rafiixr/orders, same as today.
-- No new table needed since `orders.payment_status` (pending/paid/failed)
-- already covers this.
