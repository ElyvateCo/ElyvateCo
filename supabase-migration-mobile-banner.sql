-- =============================================
-- MIGRATION: Add mobile banner support
-- Run this in Supabase → SQL Editor → New Query
-- (Only needed if you already ran the original schema before)
-- =============================================

alter table hero_section
  add column if not exists bg_image_mobile text default '';
