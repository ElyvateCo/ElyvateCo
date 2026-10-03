-- =============================================
-- ELYVATE — Online payments (bKash/Nagad API), delivery areas, custom
-- admin address.  Idempotent: safe to re-run.
-- Run in Supabase -> SQL Editor (after supabase-migration-bd-payments.sql).
-- =============================================

-- 1. Custom admin address (each merchant can rename /admin) ----------------
alter table stores add column if not exists admin_path text;
update stores set admin_path = 'admin' where admin_path is null or admin_path = '';
alter table stores alter column admin_path set default 'admin';
alter table stores alter column admin_path set not null;

-- 2. Orders: online payments + delivery ------------------------------------
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
  check (payment_method in ('card','crypto_usdt','cod','bkash_manual','nagad_manual','bkash_auto','nagad_auto'));

alter table orders
  add column if not exists gateway_payment_id text,
  add column if not exists delivery_charge    numeric(10,2) not null default 0,
  add column if not exists delivery_zone      text;

create index if not exists orders_gateway_payment_idx
  on orders (gateway_payment_id) where gateway_payment_id is not null;

-- 3. Which online gateways a store has switched on (public yes/no only —
--    the secret keys are NOT here, see section 4) -------------------------
alter table site_settings
  add column if not exists bkash_auto_enabled boolean not null default false,
  add column if not exists nagad_auto_enabled boolean not null default false;

-- 4. Merchants' bKash / Nagad API keys — ENCRYPTED by the app, server-only --
create table if not exists store_gateway_secrets (
  id                    uuid primary key default gen_random_uuid(),
  store_id              uuid not null references stores(id) on delete cascade,
  provider              text not null check (provider in ('bkash','nagad')),
  mode                  text not null default 'sandbox' check (mode in ('sandbox','live')),
  is_enabled            boolean not null default true,
  credentials_encrypted text not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (store_id, provider)
);
-- RLS on with NO policies = the public/anon key can never read this table.
alter table store_gateway_secrets enable row level security;

-- The older table from the first draft held key columns. Make sure nothing
-- public can read it (drop every policy; RLS stays on; server key still works).
do $$
declare pol record;
begin
  if to_regclass('public.store_payment_gateways') is not null then
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'store_payment_gateways'
    loop
      execute format('drop policy %I on public.store_payment_gateways', pol.policyname);
    end loop;
    execute 'alter table public.store_payment_gateways enable row level security';
  end if;
end $$;

-- 5. Delivery areas and charges --------------------------------------------
create table if not exists delivery_zones (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  name        text not null,
  charge      numeric(10,2) not null default 0 check (charge >= 0),
  free_over   numeric(10,2) check (free_over is null or free_over > 0),
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists delivery_zones_store_idx on delivery_zones (store_id);

alter table delivery_zones enable row level security;
drop policy if exists "Public can read active delivery zones" on delivery_zones;
create policy "Public can read active delivery zones"
  on delivery_zones for select using (is_active);
-- (merchants edit zones through the admin API, which uses the server key)
