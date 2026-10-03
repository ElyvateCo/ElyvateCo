-- =============================================
-- ELYVATE — Bangladesh payments (idempotent: safe to re-run)
-- Cash on Delivery + manual bKash + manual Nagad.
-- Run in Supabase -> SQL Editor.
-- =============================================

-- 1. Orders: allow the new payment methods.
--    (The old CHECK only allowed 'card' and 'crypto_usdt'. The name of that
--    constraint can differ between projects, so find it by what it checks.)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_method%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('card','crypto_usdt','cod','bkash_manual','nagad_manual'));

alter table orders alter column payment_method set default 'cod';

-- The customer's bKash/Nagad Transaction ID and the number they sent from.
alter table orders
  add column if not exists payment_trx_id        text,
  add column if not exists payment_sender_number text;

-- The same Transaction ID can never be used on two orders of one store
-- (stops a customer re-using one real payment to "pay" for many orders).
create unique index if not exists orders_store_trx_unique
  on orders (store_id, payment_trx_id)
  where payment_trx_id is not null;

-- 2. Each store chooses which payment methods it accepts.
--    These are the numbers customers send money TO, so they are shown
--    publicly at checkout. NEVER put API keys or secrets in these columns.
alter table site_settings
  add column if not exists cod_enabled    boolean not null default true,
  add column if not exists bkash_enabled  boolean not null default false,
  add column if not exists bkash_number   text,
  add column if not exists bkash_type     text    not null default 'personal',
  add column if not exists nagad_enabled  boolean not null default false,
  add column if not exists nagad_number   text,
  add column if not exists nagad_type     text    not null default 'personal';
