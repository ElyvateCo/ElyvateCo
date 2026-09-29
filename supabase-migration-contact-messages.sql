-- =============================================
-- MIGRATION: Add contact_messages table
-- Run this in Supabase → SQL Editor → New Query
-- =============================================
-- Previously the /contact page only ever sent emails — messages were never
-- saved anywhere, so there was nothing for an admin page to show even if
-- one existed. This adds real storage, matching the same "public can
-- insert, only the admin (service role) can read" pattern already used by
-- the orders table.

create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  order_id    text,
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at  timestamptz not null default now()
);

alter table contact_messages enable row level security;

create policy "Anyone can submit a contact message" on contact_messages
  for insert with check (true);

-- Intentionally no public select policy — only the admin panel (via the
-- service role key, which bypasses RLS) can read messages.
