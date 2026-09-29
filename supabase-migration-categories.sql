-- =============================================
-- MIGRATION: Add product categories
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  image_url     text default '',
  display_order int default 0,
  created_at    timestamptz default now()
);

alter table categories enable row level security;

-- Public can read categories (needed for the homepage + products page)
create policy "Public can read categories" on categories for select using (true);

-- No public insert/update/delete policy — all writes go through the
-- admin API routes using the service role key, same pattern as every
-- other admin-managed table in this app.

-- Note: products.category stays a plain text field (already existed).
-- Deleting a category here does NOT remove it from products that already
-- used that category name — it just stops appearing in the admin picker
-- and the homepage. Existing products keep their category text as-is.
