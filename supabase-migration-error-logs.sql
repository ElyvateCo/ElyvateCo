-- =============================================
-- MIGRATION: Add client-side error logging
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

create table if not exists error_logs (
  id          uuid primary key default gen_random_uuid(),
  message     text not null,
  stack       text,
  url         text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table error_logs enable row level security;

-- No public read policy — only admin (service role) can view these.
-- Public INSERT only, via the /api/log-error route, so any visitor's
-- browser can report a crash without needing to be logged in.
create policy "Anyone can report an error" on error_logs for insert with check (true);

create index if not exists error_logs_created_at_idx on error_logs(created_at desc);
