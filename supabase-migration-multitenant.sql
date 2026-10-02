-- =============================================
-- ELYVATE — Multi-tenant migration (idempotent: safe to re-run)
-- Brings the repo in line with the code, which already uses
-- `stores` and `store_id` everywhere. Compare with your LIVE schema first
-- (Supabase -> Database -> Schema Visualizer) and keep what you already have.
-- =============================================

-- 1. STORES (one row per merchant store)
create table if not exists stores (
  id                    uuid primary key default gen_random_uuid(),
  owner_user_id         uuid not null references auth.users(id) on delete cascade,
  store_name            text not null,
  subdomain             text not null unique,
  custom_domain         text unique,
  plan                  text not null default 'free' check (plan in ('free','premium')),
  admin_path            text not null default 'admin',
  business_category     text,
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  -- DNS-safe subdomain: 3-30 chars, a-z 0-9 dashes, no leading/trailing dash
  constraint stores_subdomain_format check (subdomain ~ '^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$')
);
-- One store per account for now (matches /api/store/create)
create unique index if not exists stores_owner_unique on stores(owner_user_id);

-- 2. store_id on every tenant table (nullable first so existing rows survive;
--    backfill them to your original store, then tighten to NOT NULL).
do $$
declare t text;
begin
  foreach t in array array[
    'products','categories','orders','hero_section','site_settings',
    'contact_messages','notifications','error_logs','coupons','reviews'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I add column if not exists store_id uuid references stores(id) on delete cascade', t);
      execute format('create index if not exists %I on %I(store_id)', t || '_store_id_idx', t);
    end if;
  end loop;
end $$;

-- Slugs only need to be unique PER STORE, not across the whole platform.
alter table products   drop constraint if exists products_slug_key;
alter table categories drop constraint if exists categories_slug_key;
create unique index if not exists products_store_slug_uniq   on products(store_id, slug);
create unique index if not exists categories_store_slug_uniq on categories(store_id, slug);
-- coupon codes too (only if your coupons table has a `code` column)
create unique index if not exists coupons_store_code_uniq on coupons(store_id, code);

-- 3. RLS ----------------------------------------------------------------
-- `stores` holds owner ids and domains: no public access at all. The app
-- reads it only through the service-role key on the server.
alter table stores enable row level security;

-- IMPORTANT FIX: orders / contact_messages / error_logs previously allowed
-- ANY visitor to INSERT straight from the browser with the public anon key.
-- That lets anyone create orders with total_price 0.01 or payment_status
-- 'paid', skipping the server-side price checks in /api/checkout/create.
-- All real inserts go through API routes using the service-role key (which
-- bypasses RLS), so these policies are not needed.
drop policy if exists "Anyone can create orders"             on orders;
drop policy if exists "Anyone can submit a contact message"  on contact_messages;
drop policy if exists "Anyone can report an error"           on error_logs;

-- Customers can still read their own orders by login email (policy from the
-- auth migration stays). Storefront data (products, hero, categories,
-- settings, notifications) stays publicly readable by design.

-- 4. PAYMENT CREDENTIALS: your live DB already has `store_payment_gateways`.
--    Make sure RLS is ON for it and that NO public/anon policy can read it
--    (it holds merchant API keys). Only the server (service-role key) reads it.
alter table if exists store_payment_gateways enable row level security;

-- 5. File uploads were removed: merchants paste photo/video links instead.
--    Existing uploaded files keep working (their links are stored in the rows).
