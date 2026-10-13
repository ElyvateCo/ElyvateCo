-- Main admin panel (/rafiixr): plans, trial, suspend, and the feature table.
-- Safe to run more than once.

-- 1. Plans are now free / pro / business
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.stores'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%plan%'
  loop
    execute format('alter table public.stores drop constraint %I', c.conname);
  end loop;
end $$;

update stores set plan = 'pro' where plan = 'premium';
update stores set plan = 'free' where plan is null or plan not in ('free', 'pro', 'business');
alter table stores alter column plan set default 'free';
alter table stores add constraint stores_plan_check check (plan in ('free', 'pro', 'business'));

-- 2. Suspend a store, and the 14-day Pro trial
alter table stores add column if not exists status text not null default 'active';
alter table stores drop constraint if exists stores_status_check;
alter table stores add constraint stores_status_check check (status in ('active', 'suspended'));
alter table stores add column if not exists trial_ends_at timestamptz;
-- existing free stores get a 14-day trial once, from today
update stores set trial_ends_at = now() + interval '14 days' where trial_ends_at is null and plan = 'free';

-- 3. Which features belong to which plan (edited in /rafiixr → Plans & features)
create table if not exists plan_features (
  key            text primary key,
  label          text not null,
  description    text not null default '',
  kind           text not null check (kind in ('flag', 'limit')),
  enabled        boolean not null default true,
  min_plan       text not null default 'free' check (min_plan in ('free', 'pro', 'business')),
  free_limit     int,
  pro_limit      int,
  business_limit int,
  sort           int not null default 0
);
alter table plan_features enable row level security;   -- no policies: server only

insert into plan_features (key, label, description, kind, enabled, min_plan, free_limit, pro_limit, business_limit, sort) values
 ('products_limit',       'Products',                     'How many products a store can have',               'limit', true, 'free', 5,    500,  null, 1),
 ('delivery_zones_limit', 'Delivery areas',               'How many delivery areas a store can set up',       'limit', true, 'free', 2,    null, null, 2),
 ('coupons_limit',        'Coupons',                      'How many coupons a store can create',              'limit', true, 'free', 2,    null, null, 3),
 ('auto_payments',        'Automatic bKash & Nagad',      'Customers pay online with the store''s own merchant keys', 'flag', true, 'pro', null, null, null, 4),
 ('video_templates',      'Ready-made background videos', 'Pick a video template for the homepage',           'flag',  true, 'pro',  null, null, null, 5),
 ('hero_video',           'Background video',             'Use a video link as the homepage background',      'flag',  true, 'pro',  null, null, null, 6),
 ('custom_font',          'Custom font',                  'Use your own font on the storefront',              'flag',  true, 'pro',  null, null, null, 7),
 ('admin_rename',         'Rename admin address',         'Change /admin to any name',                        'flag',  true, 'pro',  null, null, null, 8)
on conflict (key) do nothing;
