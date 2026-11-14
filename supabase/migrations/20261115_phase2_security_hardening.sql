-- Phase 2 security hardening. REVIEW AND APPLY ONLY AFTER APPROVAL.
-- Preserve the event trigger; remove direct API execution privileges.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
-- Timestamp trigger does not need elevated privileges; pin its lookup path.
ALTER FUNCTION public.geo_set_updated_at() SET search_path = pg_catalog;
-- Post-apply checks (read-only):
-- SELECT has_function_privilege('anon','public.rls_auto_enable()','EXECUTE');
-- SELECT has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE');
-- SELECT proconfig FROM pg_proc WHERE oid='public.geo_set_updated_at()'::regprocedure;
