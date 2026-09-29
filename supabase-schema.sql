-- =============================================
-- ELYVATE — Supabase Database Schema
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

-- 1. PRODUCTS TABLE
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  price         numeric(10,2) not null default 0,
  compare_price numeric(10,2),
  images        text[] default '{}',
  category      text default '',
  stock_status  text not null default 'in_stock' check (stock_status in ('in_stock','out_of_stock')),
  is_featured   boolean default false,
  rating        numeric(3,1) default 0,
  review_count  int default 0,
  created_at    timestamptz default now()
);

-- 1a. CATEGORIES TABLE
create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  image_url     text default '',
  display_order int default 0,
  created_at    timestamptz default now()
);

-- 2. ORDERS TABLE
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text not null,
  customer_address  text not null,
  customer_city     text not null,
  customer_country  text not null,
  customer_zip      text not null,
  product_id        text not null,
  product_name      text not null,
  quantity          int not null default 1,
  total_price       numeric(10,2) not null,
  payment_status    text not null default 'pending' check (payment_status in ('pending','paid','failed')),
  payment_method    text not null default 'card' check (payment_method in ('card', 'crypto_usdt')),
  crypto_amount     numeric(10,2),
  crypto_network    text,
  order_status      text not null default 'processing' check (order_status in ('processing','fulfilled','shipped','delivered','cancelled')),
  twocheckout_ref   text,
  created_at        timestamptz default now()
);

-- 3. HERO SECTION TABLE
create table if not exists hero_section (
  id           uuid primary key default gen_random_uuid(),
  headline     text default 'Elevate Your Space',
  subheadline  text default 'Premium ambient lighting & projection gadgets for your home.',
  cta_text     text default 'Shop Now',
  cta_link     text default '/products',
  bg_image     text default '',
  bg_image_mobile text default '',
  bg_video        text default '',
  bg_video_mobile text default '',
  headline_morph_words text default null
);

-- Insert default hero row
insert into hero_section (headline, subheadline, cta_text, cta_link)
values ('Elevate Your Space', 'Premium ambient lighting & projection gadgets that transform any room into an experience.', 'Shop Now', '/products')
on conflict do nothing;

-- 4. SITE SETTINGS TABLE
create table if not exists site_settings (
  id                   uuid primary key default gen_random_uuid(),
  store_name           text default 'Elyvate',
  logo_url             text,
  announcement_text    text,
  announcement_active  boolean default false,
  instagram_url        text,
  tiktok_url           text,
  facebook_url         text,
  custom_font_url      text default null,
  custom_font_name     text default null,
  theme_preset         text default 'indigo',
  custom_theme_hex     text default null,
  crypto_usdt_enabled  boolean default false,
  crypto_usdt_address  text default '',
  crypto_usdt_network  text default 'TRC20'
);

-- Insert default settings row
insert into site_settings (store_name)
values ('Elyvate')
on conflict do nothing;

-- 5. CONTACT MESSAGES TABLE
create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  order_id    text,
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at  timestamptz not null default now()
);

-- 6. NOTIFICATIONS TABLE
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('broadcast', 'order_update')),
  title       text not null,
  message     text not null,
  link        text,
  order_id    uuid references orders(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- 7. ERROR LOGS TABLE
create table if not exists error_logs (
  id          uuid primary key default gen_random_uuid(),
  message     text not null,
  stack       text,
  url         text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Products: public read, no public write
alter table products enable row level security;
create policy "Public can read products" on products for select using (true);

-- Categories: public read, no public write
alter table categories enable row level security;
create policy "Public can read categories" on categories for select using (true);

-- Orders: public insert (for checkout), no public read
alter table orders enable row level security;
create policy "Anyone can create orders" on orders for insert with check (true);

-- Hero section: public read
alter table hero_section enable row level security;
create policy "Public can read hero" on hero_section for select using (true);

-- Site settings: public read
alter table site_settings enable row level security;
create policy "Public can read settings" on site_settings for select using (true);

-- Contact messages: public insert (for the contact form), no public read
alter table contact_messages enable row level security;
create policy "Anyone can submit a contact message" on contact_messages for insert with check (true);

-- Notifications: public read (guest checkouts have no account to gate
-- behind — content is always generic status text, never customer PII).
-- Writes only via the admin API using the service role key.
alter table notifications enable row level security;
create policy "Public can read notifications" on notifications for select using (true);
alter publication supabase_realtime add table notifications;

-- Error logs: public insert only (any visitor's browser can report a
-- crash), no public read — only admin (service role) can view them.
alter table error_logs enable row level security;
create policy "Anyone can report an error" on error_logs for insert with check (true);

-- =============================================
-- STORAGE BUCKET for product images
-- =============================================
-- Go to Supabase → Storage → New Bucket
-- Name: product-images
-- Public: YES (toggle on)
-- =============================================
