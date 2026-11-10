-- =============================================================================
-- Phase 1 · Migration 002 · READ-ONLY preflight
--
-- Project: investor-geo  (run in the Supabase SQL Editor)
-- Scope:   SELECT-only. Nothing is created, altered, inserted, or deleted.
--
-- What it verifies before applying supabase/migrations/002_geo_foundation.sql:
--   ENV  environment prerequisites (PG version, database, CREATE, gen_random_uuid, roles)
--   TBL  none of the six target tables/relations already exist
--   IDX  none of the 17 index/constraint relation names are already taken
--   CON  none of the 8 inline PK/UNIQUE constraints exist on the target tables
--   FUNC no incompatible public.geo_set_updated_at() exists
--   TRG  no conflicting trigger names on the target tables
--   POL  no conflicting geo_service_role_all policy on the target tables
--   CS   public.content_store exists, has the expected columns, and a baseline
--        (RLS flag, row count, md5 for id = 1) is captured
--
-- The last row (SUMMARY) is computed from this result set only.
-- Expected result before applying the migration:
--   * every row is PASS
--   * SUMMARY shows actual = 0 and status = PASS
-- If anything is FAIL, STOP and report it instead of applying the migration.
-- =============================================================================

with
target_tables(name) as (
  values
    ('site_pages'),
    ('page_versions'),
    ('audit_logs'),
    ('agent_jobs'),
    ('agent_runs'),
    ('approval_requests')
),
target_indexes(name) as (
  -- implicit PK / UNIQUE relation names
  values
    ('site_pages_pkey'),
    ('site_pages_slug_key'),
    ('page_versions_pkey'),
    ('page_versions_page_version_key'),
    ('audit_logs_pkey'),
    ('agent_jobs_pkey'),
    ('agent_runs_pkey'),
    ('approval_requests_pkey'),
  -- explicit CREATE INDEX statements in 002_geo_foundation.sql
    ('idx_page_versions_page_version'),
    ('idx_audit_logs_created_at'),
    ('idx_audit_logs_entity'),
    ('idx_agent_jobs_status_scheduled'),
    ('idx_agent_runs_job'),
    ('idx_agent_runs_started_at'),
    ('idx_approval_requests_status'),
    ('idx_approval_requests_entity'),
    ('uniq_pending_approval_per_entity')
),
target_constraints(tbl, name) as (
  values
    ('site_pages',       'site_pages_pkey'),
    ('site_pages',       'site_pages_slug_key'),
    ('page_versions',    'page_versions_pkey'),
    ('page_versions',    'page_versions_page_version_key'),
    ('audit_logs',       'audit_logs_pkey'),
    ('agent_jobs',       'agent_jobs_pkey'),
    ('agent_runs',       'agent_runs_pkey'),
    ('approval_requests','approval_requests_pkey')
),
checks as (
  -- ---------------------------------------------------------------------------
  -- ENV: environment prerequisites
  -- ---------------------------------------------------------------------------
  select
    10 as ord,
    'ENV-01' as check_id,
    'environment' as category,
    'PostgreSQL >= 13' as check_name,
    '>= 130000' as expected,
    current_setting('server_version_num') as actual,
    case when current_setting('server_version_num')::int >= 130000
         then 'PASS' else 'FAIL' end as status,
    'server_version = ' || current_setting('server_version') as details

  union all
  select
    11, 'ENV-02', 'environment',
    'connected database is postgres', 'postgres',
    current_database(),
    case when current_database() = 'postgres' then 'PASS' else 'FAIL' end,
    'current_user = ' || current_user || ', current_role = ' || current_role

  union all
  select
    12, 'ENV-03', 'environment',
    'current role can CREATE in schema public', 'true',
    has_schema_privilege(current_user, 'public', 'CREATE')::text,
    case when has_schema_privilege(current_user, 'public', 'CREATE')
         then 'PASS' else 'FAIL' end,
    'schema public = ' || coalesce(to_regnamespace('public')::text, 'MISSING')

  union all
  select
    13, 'ENV-04', 'environment',
    'gen_random_uuid() is available', 'true',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'gen_random_uuid'
    )::text,
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'gen_random_uuid'
    ) then 'PASS' else 'FAIL' end,
    'required by the id default on all six tables'

  union all
  select
    14, 'ENV-05', 'roles',
    'anon + authenticated + service_role exist', '3',
    (select count(*)::text
       from pg_roles
      where rolname in ('anon', 'authenticated', 'service_role')),
    case when (select count(*)
                 from pg_roles
                where rolname in ('anon', 'authenticated', 'service_role')) = 3
         then 'PASS' else 'FAIL' end,
    coalesce((select string_agg(rolname, ', ' order by rolname)
                from pg_roles
               where rolname in ('anon', 'authenticated', 'service_role')), 'none')

  union all
  select
    15, 'ENV-06', 'environment',
    'default ACLs in public (recorded)', 'informational',
    coalesce((select string_agg(defaclacl::text, '; ')
                from pg_default_acl
               where defaclnamespace = 'public'::regnamespace), 'none'),
    'PASS',
    'migration 002 revokes anon/authenticated explicitly after CREATE TABLE'

  -- ---------------------------------------------------------------------------
  -- TBL: the six target tables must not exist yet
  -- ---------------------------------------------------------------------------
  union all
  select
    100 + row_number() over (order by name),
    'TBL-' || name,
    'tables',
    name || ' must not exist yet',
    'absent',
    coalesce(to_regclass('public.' || name)::text, 'absent'),
    case when to_regclass('public.' || name) is null then 'PASS' else 'FAIL' end,
    'a pre-existing relation makes CREATE TABLE IF NOT EXISTS silently skip'
  from target_tables

  -- ---------------------------------------------------------------------------
  -- IDX: index / constraint relation names are schema-wide
  -- ---------------------------------------------------------------------------
  union all
  select
    200 + row_number() over (order by name),
    'IDX-' || name,
    'indexes',
    'index name ' || name || ' must be free',
    'absent',
    coalesce(to_regclass('public.' || name)::text, 'absent'),
    case when to_regclass('public.' || name) is null then 'PASS' else 'FAIL' end,
    'CREATE INDEX IF NOT EXISTS would silently skip a pre-existing index'
  from target_indexes

  -- ---------------------------------------------------------------------------
  -- CON: inline PK / UNIQUE constraints on the target tables
  -- ---------------------------------------------------------------------------
  union all
  select
    300 + row_number() over (order by tbl, name),
    'CON-' || name,
    'constraints',
    'constraint ' || name || ' must be free on public.' || tbl,
    'absent',
    case when exists (
      select 1
      from pg_constraint c
      where c.conname = tc.name
        and c.conrelid = to_regclass('public.' || tc.tbl)
    ) then 'present on ' || tc.tbl else 'absent' end,
    case when exists (
      select 1
      from pg_constraint c
      where c.conname = tc.name
        and c.conrelid = to_regclass('public.' || tc.tbl)
    ) then 'FAIL' else 'PASS' end,
    'PK / UNIQUE constraint declared inline in CREATE TABLE'
  from target_constraints tc

  -- ---------------------------------------------------------------------------
  -- FUNC: CREATE OR REPLACE FUNCTION compatibility
  -- ---------------------------------------------------------------------------
  union all
  select
    400, 'FUNC-01', 'function',
    'no incompatible public.geo_set_updated_at()', '0 conflicting',
    (select count(*)::text
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'geo_set_updated_at'
        and p.pronargs = 0
        and p.prorettype <> 'trigger'::regtype),
    case when (select count(*)
                 from pg_proc p
                 join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public'
                  and p.proname = 'geo_set_updated_at'
                  and p.pronargs = 0
                  and p.prorettype <> 'trigger'::regtype) = 0
         then 'PASS' else 'FAIL' end,
    coalesce((select string_agg(p.oid::regprocedure::text, ', ')
                from pg_proc p
                join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public'
                 and p.proname = 'geo_set_updated_at'), 'none')

  -- ---------------------------------------------------------------------------
  -- TRG: trigger names on the target tables (safe to re-run)
  -- ---------------------------------------------------------------------------
  union all
  select
    410, 'TRG-01', 'triggers',
    'no conflicting trigger name on target tables', '0',
    (select count(*)::text
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal
        and t.tgname in ('trg_site_pages_updated_at', 'trg_agent_jobs_updated_at')
        and c.relname in ('site_pages', 'agent_jobs')),
    case when (select count(*)
                 from pg_trigger t
                 join pg_class c on c.oid = t.tgrelid
                 join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public'
                  and not t.tgisinternal
                  and t.tgname in ('trg_site_pages_updated_at', 'trg_agent_jobs_updated_at')
                  and c.relname in ('site_pages', 'agent_jobs')) = 0
         then 'PASS' else 'FAIL' end,
    coalesce((select string_agg(c.relname || '.' || t.tgname, ', ')
                from pg_trigger t
                join pg_class c on c.oid = t.tgrelid
                join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public'
                 and not t.tgisinternal
                 and t.tgname in ('trg_site_pages_updated_at', 'trg_agent_jobs_updated_at')), 'none')

  -- ---------------------------------------------------------------------------
  -- POL: policy names on the target tables (safe to re-run)
  -- ---------------------------------------------------------------------------
  union all
  select
    420, 'POL-01', 'policies',
    'no conflicting policy on target tables', '0',
    (select count(*)::text
       from pg_policies
      where schemaname = 'public'
        and policyname = 'geo_service_role_all'
        and tablename in ('site_pages', 'page_versions', 'audit_logs',
                          'agent_jobs', 'agent_runs', 'approval_requests')),
    case when (select count(*)
                 from pg_policies
                where schemaname = 'public'
                  and policyname = 'geo_service_role_all'
                  and tablename in ('site_pages', 'page_versions', 'audit_logs',
                                    'agent_jobs', 'agent_runs', 'approval_requests')) = 0
         then 'PASS' else 'FAIL' end,
    coalesce((select string_agg(tablename || '.' || policyname, ', ')
                from pg_policies
               where schemaname = 'public'
                 and policyname = 'geo_service_role_all'), 'none')

  -- ---------------------------------------------------------------------------
  -- CS: public.content_store must exist and stay untouched
  -- ---------------------------------------------------------------------------
  union all
  select
    500, 'CS-01', 'content_store',
    'table public.content_store exists', 'true',
    (to_regclass('public.content_store') is not null)::text,
    case when to_regclass('public.content_store') is not null then 'PASS' else 'FAIL' end,
    'pre-existing table; migration 002 must not touch it'

  union all
  select
    501, 'CS-02', 'content_store',
    'columns id, content, updated_at present', '3',
    (select count(*)::text
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'content_store'
        and column_name in ('id', 'content', 'updated_at')),
    case when (select count(*)
                 from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'content_store'
                  and column_name in ('id', 'content', 'updated_at')) = 3
         then 'PASS' else 'FAIL' end,
    coalesce((select string_agg(column_name || ':' || data_type, ', ' order by column_name)
                from information_schema.columns
               where table_schema = 'public' and table_name = 'content_store'), 'none')

  union all
  select
    502, 'CS-03', 'content_store',
    'RLS flag baseline (recorded)', 'recorded',
    case when (select c.relrowsecurity
                 from pg_class c
                 join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname = 'content_store')
         then 'enabled' else 'disabled' end,
    'PASS',
    'compare with post-migration verification'

  union all
  select
    503, 'CS-04', 'content_store',
    'row count baseline (recorded)', 'recorded',
    (select count(*)::text from public.content_store),
    'PASS',
    'compare with post-migration verification'

  union all
  select
    504, 'CS-05', 'content_store',
    'md5(content) baseline for id = 1 (recorded)', 'recorded',
    coalesce((select md5(content::text) from public.content_store where id = 1), 'no row id=1'),
    'PASS',
    'must be identical after the migration'
)
select
  check_id,
  category,
  check_name,
  expected,
  actual,
  status,
  details
from (
  select ord, check_id, category, check_name, expected, actual, status, details
  from checks
  union all
  select
    999999,
    'SUMMARY',
    'summary',
    'overall preflight verdict',
    '0 FAIL rows',
    (select count(*)::text from checks where status = 'FAIL'),
    case when (select count(*) from checks where status = 'FAIL') = 0
         then 'PASS' else 'FAIL' end,
    'computed from this result set only'
) all_checks
order by ord, check_id;
