-- =============================================
-- MIGRATION: Add custom site-wide font support
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

alter table site_settings
  add column if not exists custom_font_url  text default null,
  add column if not exists custom_font_name text default null;

-- Also create the Storage bucket for font files:
-- Supabase Dashboard → Storage → New Bucket → name it exactly "site-fonts"
-- → toggle Public bucket: ON → Create
