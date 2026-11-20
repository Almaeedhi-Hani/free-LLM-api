-- Isolated PostgreSQL 17 fixture. Never run against Supabase production.
DO $roles$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$roles$;
CREATE TABLE public.content_store (
 id integer PRIMARY KEY,
 content jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Actual versioned RPCs, not reimplementations or mocks:
\i supabase/migrations/20261118_geo_guarded_automatic_publication.sql
\i supabase/migrations/20261118_geo_source_optional_unattended_publish.sql
UPDATE public.geo_publication_settings
 SET enabled=true, allow_high_risk=true, daily_limit=3 WHERE id=1;
INSERT INTO public.content_store (id,content)
SELECT 1, jsonb_build_object(
 'editorialItems',jsonb_agg(jsonb_build_object(
   'id','ed-race-isolated-'||lpad(n::text,2,'0'),
   'kind','guide','lang','en',
   'slug','isolated-guide-'||n,'target','isolated-guide-'||n,
   'title','Synthetic isolated publication concurrency item '||n,
   'body',repeat('Only test fixture text; verify current official requirements independently. ',3),
   'risk_level','low','status','pending',
   'evidence_ids',jsonb_build_array('synthetic-only'),
   'evidence_refs',jsonb_build_array()
 ) ORDER BY n),
 'drafts',jsonb_build_array(jsonb_build_object(
  'q','Which documents are relevant to an isolated test FAQ?',
  'a',repeat('Synthetic-only answer for disposable database concurrency testing. ',2),
  'risk_level','low','status','pending'
 )),
 'faqs',jsonb_build_array())
FROM generate_series(1,5) AS g(n);
DO $assert$
BEGIN
 IF (SELECT daily_limit FROM public.geo_publication_settings WHERE id=1)<>3 OR
  (SELECT enabled FROM public.geo_publication_settings WHERE id=1) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Fixture policy not ready'; END IF;
 IF (SELECT count(*) FROM public.content_store WHERE id=1)<>1
 THEN RAISE EXCEPTION 'Fixture content not ready'; END IF;
END
$assert$;
