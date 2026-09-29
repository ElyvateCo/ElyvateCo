-- =============================================
-- ELYVATE — Coupons Table Migration
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

create table if not exists coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  type          text not null check (type in ('percentage', 'fixed')),
  value         numeric(10,2) not null,           -- % amount OR fixed $ amount
  min_order     numeric(10,2) default 0,           -- minimum cart total to apply
  usage_limit   int default null,                  -- null = unlimited
  usage_count   int not null default 0,
  expires_at    timestamptz default null,           -- null = never expires
  is_active     boolean not null default true,
  created_at    timestamptz default now()
);

-- Also add coupon fields to orders table
alter table orders
  add column if not exists coupon_code    text default null,
  add column if not exists discount_amount numeric(10,2) default 0;

-- RLS: public cannot read or write coupons directly
-- Validation happens server-side via service role key
alter table coupons enable row level security;

-- No public policies — admin only via service role
-- =============================================
