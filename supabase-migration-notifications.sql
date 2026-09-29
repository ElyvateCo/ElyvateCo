-- =============================================
-- MIGRATION: Add notifications system
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('broadcast', 'order_update')),
  title       text not null,
  message     text not null,
  link        text,
  order_id    uuid references orders(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table notifications enable row level security;

-- Public read — needed since most customers check out as guests with no
-- account, so there's no per-user auth to gate this behind. The content is
-- always generic status text (never customer name/address/email), and
-- order_id is a random UUID, so this is safe to expose broadly. Writes only
-- happen via the admin API (service role), never directly from the client.
create policy "Public can read notifications" on notifications for select using (true);

-- Required for Supabase Realtime to broadcast INSERTs on this table to
-- subscribed clients — this is what makes notifications appear live/instant
-- instead of only on next page load.
alter publication supabase_realtime add table notifications;

create index if not exists notifications_order_id_idx on notifications(order_id);
create index if not exists notifications_created_at_idx on notifications(created_at desc);
