-- Ready-made background videos that every merchant can pick in Admin -> Hero.
-- You host the files (e.g. Cloudflare R2) and just add a row per video here.
create table if not exists video_templates (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  video_url     text not null,          -- full https:// link to the .mp4 / .webm
  thumbnail_url text,                   -- optional preview picture (https link)
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table video_templates enable row level security;
drop policy if exists "Public can read active video templates" on video_templates;
create policy "Public can read active video templates" on video_templates for select using (is_active);

-- Example (replace with your real link):
-- insert into video_templates (title, video_url, thumbnail_url, sort_order)
-- values ('Soft waves', 'https://pub-xxxx.r2.dev/waves.mp4', null, 1);
