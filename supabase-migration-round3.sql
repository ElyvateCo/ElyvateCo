-- Round 3: landing page editor, free-trial switch, platform settings.
-- Safe to run more than once. (Run supabase-migration-platform-admin.sql and
-- supabase-migration-video-templates.sql first if you haven't.)

-- Settings of the whole platform (e.g. the free-trial switch). Server only.
create table if not exists platform_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table platform_settings enable row level security;   -- no policies

-- The free trial starts OFF. Turn it on/off any time in /rafiixr → Plans & features.
insert into platform_settings (key, value) values ('free_trial', '{"enabled": false, "days": 14}')
on conflict (key) do nothing;

-- Remove the trial dates that were given to every store earlier
update stores set trial_ends_at = null where plan = 'free';

-- The landing page text, edited in /rafiixr → Landing page. Server only.
create table if not exists landing_content (
  key        text primary key,
  content    jsonb not null,
  updated_at timestamptz not null default now()
);
alter table landing_content enable row level security;     -- no policies
