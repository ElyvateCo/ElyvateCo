-- =============================================
-- MIGRATION: Add custom (non-preset) theme color support
-- Run this in Supabase → SQL Editor → New Query
-- =============================================

alter table site_settings
  add column if not exists custom_theme_hex text default null;

-- theme_preset now also accepts the value 'custom', in which case
-- custom_theme_hex holds the admin-picked base color and the full 50–900
-- scale is generated from it at request time (see lib/themePresets.ts).
