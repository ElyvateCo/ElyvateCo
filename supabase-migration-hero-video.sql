-- =============================================
-- MIGRATION: Add hero video support
-- Run this in Supabase → SQL Editor → New Query
-- (Only needed if you already ran the original schema before)
-- =============================================

alter table hero_section
  add column if not exists bg_video text default '',
  add column if not exists bg_video_mobile text default '';
