-- PHASE 1.6 / DRAFT FOR OWNER REVIEW ONLY — DO NOT APPLY TO PRODUCTION.
-- File intentionally stored under docs/plans/security/, NOT supabase/migrations/.
-- Checked in Supabase project (2026-11-19): both functions exist and are owned
-- by postgres; rls_auto_enable() is SECURITY DEFINER with search_path=pg_catalog;
-- geo_set_updated_at() is SECURITY INVOKER with no pinned search_path.
-- This change is security hardening only. It does not grant any access to private tables.
-- Do not run this file until explicit owner authorization, and review live privileges
-- and dependent event triggers immediately before the proposed migration.

BEGIN;

-- No public or user-invoked execution of a privileged event trigger function.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;

-- No untrusted caller-controlled lookup path in the trigger function.
ALTER FUNCTION public.geo_set_updated_at()
  SET search_path = pg_catalog;

COMMIT;

-- Owner-approved deployment acceptance, run separately as SELECTs:
-- SELECT p.proname, p.prosecdef, p.proconfig,
--        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_exec,
--        has_function_privilege('authenticated',p.oid,'EXECUTE') AS user_exec
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public'
--   AND p.proname IN ('rls_auto_enable','geo_set_updated_at');
--
-- IMPORTANT: no broad RLS GRANT or POLICY changes; do not run "fix all" advisories.
-- To reverse only the new pinned search path, use a separately approved
-- ALTER FUNCTION public.geo_set_updated_at() RESET search_path;
-- Regrant of privileged EXECUTE would revive the security exposure; do not
-- automatically roll back the REVOKE without an owner-approved necessity review.
