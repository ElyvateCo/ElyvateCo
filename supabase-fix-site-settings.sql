-- Fixes: "Could not find the 'crypto_usdt_enabled' column of 'site_settings'".
-- Admin Settings could not be saved, so bKash/Nagad never turned on for buyers.
-- Safe to run more than once.
alter table site_settings
  add column if not exists crypto_usdt_enabled boolean not null default false,
  add column if not exists crypto_usdt_address text,
  add column if not exists crypto_usdt_network text not null default 'TRC20';

-- make the API see the new columns right away
notify pgrst, 'reload schema';
