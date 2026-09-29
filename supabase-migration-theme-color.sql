-- =============================================
-- MIGRATION: Add site-wide color theme support
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

alter table site_settings
  add column if not exists theme_preset text default 'indigo';
