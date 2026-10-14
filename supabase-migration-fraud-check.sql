-- Fraud check (courier delivery history for a customer's phone number).
-- Safe to run more than once.

-- Saved lookups, so the same number isn't paid for twice within 24 hours
create table if not exists fraud_cache (
  phone      text primary key,
  result     jsonb not null,
  checked_at timestamptz not null default now()
);

-- One row per check: used for each store's daily limit and the platform's daily cap
create table if not exists fraud_checks (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid references stores(id) on delete cascade,
  phone      text not null,
  live       boolean not null default true,   -- true = paid API call, false = served from the saved copy
  created_at timestamptz not null default now()
);
create index if not exists fraud_checks_store_day_idx on fraud_checks (store_id, created_at);
create index if not exists fraud_checks_live_day_idx  on fraud_checks (live, created_at);

-- Server only: no policies
alter table fraud_cache  enable row level security;
alter table fraud_checks enable row level security;

-- The per-plan daily limit shown in /rafiixr → Plans & features
insert into plan_features (key, label, description, kind, enabled, min_plan, free_limit, pro_limit, business_limit, sort) values
 ('fraud_checks_daily', 'Fraud checks per day', 'Customer phone lookups per day (courier delivery history)', 'limit', true, 'free', 3, 20, 100, 9)
on conflict (key) do nothing;
