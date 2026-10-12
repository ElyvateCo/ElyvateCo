-- Customers of each store. A shopper's login account is shared by the whole
-- platform, but this table records which STORES they actually joined, so every
-- store owner only ever sees their own customers. Safe to run more than once.
create table if not exists store_customers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);
create index if not exists store_customers_store_idx on store_customers (store_id);

-- No policies on purpose: only the server (service key) can read or write it.
alter table store_customers enable row level security;
