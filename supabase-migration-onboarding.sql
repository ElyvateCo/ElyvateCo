-- =============================================
-- ONBOARDING — run ONCE in the Supabase SQL Editor
-- BEFORE deploying the onboarding code.
-- Adds two columns to `stores`. Everything else the onboarding wizard
-- saves goes into columns that already exist:
--   site_settings: store_name, theme_preset, custom_theme_hex,
--                  logo_url, facebook_url, instagram_url
--   hero_section:  subheadline (the store tagline)
-- =============================================
alter table stores add column if not exists business_category text;
alter table stores add column if not exists onboarding_completed boolean not null default false;
