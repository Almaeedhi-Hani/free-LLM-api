\set ON_ERROR_STOP on
-- Run with: psql -v ON_ERROR_STOP=1 -f tests/sql/phase2-security.sql
\ir fixtures/phase2-production-functions.sql
DO $$ BEGIN
  IF NOT has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') THEN RAISE EXCEPTION 'fixture: anon expected execute'; END IF;
  IF NOT has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') THEN RAISE EXCEPTION 'fixture: authenticated expected execute'; END IF;
END $$;
\ir ../../supabase/migrations/20261115_phase2_security_hardening.sql
DO $$ BEGIN
  IF has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') THEN RAISE EXCEPTION 'anon can execute rls_auto_enable'; END IF;
  IF has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') THEN RAISE EXCEPTION 'authenticated can execute rls_auto_enable'; END IF;
  IF (SELECT proconfig IS NULL OR NOT ('search_path=pg_catalog'=ANY(proconfig)) FROM pg_proc WHERE oid='public.geo_set_updated_at()'::regprocedure) THEN RAISE EXCEPTION 'timestamp function search_path not pinned'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname='ensure_rls' AND evtenabled='O') THEN RAISE EXCEPTION 'event trigger disabled'; END IF;
END $$;
CREATE TABLE public.phase2_rls_test (id integer primary key, updated_at timestamptz);
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.phase2_rls_test'::regclass) THEN RAISE EXCEPTION 'new public table missing RLS'; END IF;
END $$;
CREATE TRIGGER phase2_updated_at BEFORE UPDATE ON public.phase2_rls_test FOR EACH ROW EXECUTE FUNCTION public.geo_set_updated_at();
INSERT INTO public.phase2_rls_test(id,updated_at) VALUES (1, '2000-01-01'::timestamptz);
UPDATE public.phase2_rls_test SET updated_at='2000-01-01'::timestamptz WHERE id=1;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.phase2_rls_test WHERE id=1 AND updated_at > '2000-01-01'::timestamptz) THEN RAISE EXCEPTION 'updated_at trigger did not run'; END IF;
END $$;
DROP TABLE public.phase2_rls_test;
SELECT 'PHASE2_SQL_SECURITY_TESTS_PASSED' AS result;
