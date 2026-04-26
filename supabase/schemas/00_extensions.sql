-- =============================================================================
-- CoupleGoAI — Extensions
-- =============================================================================
-- Enable required Postgres extensions.
-- moddatetime: auto-update updated_at columns via trigger.
-- pgtap: database unit tests executed by `supabase test db`.
-- =============================================================================

create extension if not exists "moddatetime" with schema "extensions";
create extension if not exists "pgtap" with schema "extensions";
