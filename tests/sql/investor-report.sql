\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE TABLE public.package_requests(created_at timestamptz,locale text,origin_path text);
ALTER TABLE public.package_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.package_requests TO service_role;
\ir ../../supabase/migrations/20261125050926_investor_daily_conversion_analytics.sql
DO $$ BEGIN
 IF has_function_privilege('anon','public.increment_investor_daily_signal(text,text,text)','EXECUTE') OR has_function_privilege('authenticated','public.read_investor_daily_report(integer,text,text)','EXECUTE') OR has_table_privilege('anon','public.investor_daily_signals','SELECT') THEN RAISE EXCEPTION 'public analytics access'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.investor_daily_signals'::regclass) THEN RAISE EXCEPTION 'missing RLS'; END IF;
END $$;
INSERT INTO public.package_requests VALUES(now(),'ar','/services/company-formation'),(now(),'zh',NULL),(now()-interval '95 days','ar',NULL);
SET LOCAL ROLE service_role;
SELECT public.increment_investor_daily_signal('company-formation','ar','page_view');
SELECT public.increment_investor_daily_signal('company-formation','ar','page_view');
SELECT public.increment_investor_daily_signal('company-formation','ar','whatsapp_click');
SELECT public.increment_investor_daily_signal('home','en','page_view');
DO $$ DECLARE r jsonb; BEGIN
 r:=public.read_investor_daily_report(7,'ar','company-formation');
 IF jsonb_array_length(r->'signals')<>2 OR (SELECT sum((x->>'total')::int) FROM jsonb_array_elements(r->'signals') x)<>3 OR jsonb_array_length(r->'requests')<>1 THEN RAISE EXCEPTION 'bad filtered report %',r; END IF;
 r:=public.read_investor_daily_report(90,'all','all');
 IF jsonb_array_length(r->'requests')<>2 THEN RAISE EXCEPTION 'incorrect period'; END IF;
 BEGIN PERFORM public.increment_investor_daily_signal('invalid','ar','page_view'); RAISE EXCEPTION 'bad event accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.read_investor_daily_report(365,'all','all'); RAISE EXCEPTION 'bad period accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
ROLLBACK;
SELECT 'INVESTOR_REPORT_SQL_PASSED';
