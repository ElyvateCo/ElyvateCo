-- =============================================
-- MIGRATION: Add animated (text-morph) headline support
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

alter table hero_section
  add column if not exists headline_morph_words text default null;

-- If set to 2+ lines/words, the storefront shows an animated morphing
-- headline that cycles through them instead of the static `headline` text.
-- Leave empty (default) to keep the plain static headline.
