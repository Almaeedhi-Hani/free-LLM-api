-- =============================================================================
-- Phase 1 migration verification (READ-ONLY)
-- Run in the Supabase SQL Editor AFTER applying 002_geo_foundation.sql.
-- Every statement below is a SELECT; nothing is created, altered, or deleted.
-- =============================================================================

-- 1) Expected tables: exactly 6 rows.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'site_pages', 'page_versions', 'audit_logs',
    'agent_jobs', 'agent_runs', 'approval_requests'
  )
order by table_name;

-- 2) RLS must be enabled on all 6 tables (relrowsecurity = true).
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'site_pages', 'page_versions', 'audit_logs',
    'agent_jobs', 'agent_runs', 'approval_requests'
  )
order by c.relname;

-- 3) Only service_role should have policies (one per table).
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'site_pages', 'page_versions', 'audit_logs',
    'agent_jobs', 'agent_runs', 'approval_requests'
  )
order by tablename;

-- 4) service_role must hold SELECT/INSERT/UPDATE/DELETE on every table.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'service_role'
  and table_name in (
    'site_pages', 'page_versions', 'audit_logs',
    'agent_jobs', 'agent_runs', 'approval_requests'
  )
order by table_name, privilege_type;

-- 5) anon/authenticated must have no privileges on the new tables.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'site_pages', 'page_versions', 'audit_logs',
    'agent_jobs', 'agent_runs', 'approval_requests'
  )
order by table_name, grantee, privilege_type;

-- 6) Critical constraints: optimistic-lock uniqueness and status checks.
select conrelid::regclass as table_name, conname, contype
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    to_regclass('public.site_pages'),
    to_regclass('public.page_versions'),
    to_regclass('public.audit_logs'),
    to_regclass('public.agent_jobs'),
    to_regclass('public.agent_runs'),
    to_regclass('public.approval_requests')
  )
order by conrelid::regclass::text, conname;

-- 7) Expected indexes (including uniq_pending_approval_per_entity).
select tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'site_pages', 'page_versions', 'audit_logs',
    'agent_jobs', 'agent_runs', 'approval_requests'
  )
order by tablename, indexname;

-- 8) content_store must still exist and be unchanged by this migration.
--    Capture updated_at/content_md5 BEFORE applying 002 (preflight section 6)
--    and compare it with this output.
select id, updated_at, jsonb_typeof(content) as content_type, md5(content::text) as content_md5
from public.content_store
where id = 1;

-- 9) Triggers and function ----------------------------------------------------
select 'function' as object_kind, 'geo_set_updated_at' as object_name,
       (select count(*) from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'geo_set_updated_at') as found,
       1 as expected
union all
select 'trigger', tgname, 1, 1
from pg_trigger
where tgname in ('trg_site_pages_updated_at', 'trg_agent_jobs_updated_at')
  and not tgisinternal
order by object_kind, object_name;

-- 10) PASS/FAIL summary -------------------------------------------------------
with metrics as (
  select
    'Phase 1 tables' as check_name,
    (select count(*) from information_schema.tables
      where table_schema = 'public'
        and table_name in ('site_pages','page_versions','audit_logs',
                           'agent_jobs','agent_runs','approval_requests'))::bigint as actual,
    6::bigint as expected
  union all
  select 'RLS enabled',
    (select count(*) from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('site_pages','page_versions','audit_logs',
                          'agent_jobs','agent_runs','approval_requests')
        and c.relrowsecurity)::bigint,
    6::bigint
  union all
  select 'service_role policies',
    (select count(*) from pg_policies
      where schemaname = 'public' and policyname = 'geo_service_role_all'
        and tablename in ('site_pages','page_versions','audit_logs',
                          'agent_jobs','agent_runs','approval_requests'))::bigint,
    6::bigint
  union all
  select 'service_role privileges',
    (select count(*) from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'service_role'
        and table_name in ('site_pages','page_versions','audit_logs',
                           'agent_jobs','agent_runs','approval_requests')
        and privilege_type in ('SELECT','INSERT','UPDATE','DELETE'))::bigint,
    24::bigint
  union all
  select 'forbidden anon/authenticated grants',
    (select count(*) from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon','authenticated')
        and table_name in ('site_pages','page_versions','audit_logs',
                           'agent_jobs','agent_runs','approval_requests'))::bigint,
    0::bigint
  union all
  select 'unique page version constraint',
    (select count(*) from pg_constraint
      where conname = 'page_versions_page_version_key'
        and connamespace = 'public'::regnamespace)::bigint,
    1::bigint
  union all
  select 'unique pending approval index',
    (select count(*) from pg_indexes
      where schemaname = 'public'
        and indexname = 'uniq_pending_approval_per_entity')::bigint,
    1::bigint
  union all
  select 'updated_at triggers',
    (select count(*) from pg_trigger
      where tgname in ('trg_site_pages_updated_at','trg_agent_jobs_updated_at')
        and not tgisinternal)::bigint,
    2::bigint
  union all
  select 'updated_at function',
    (select count(*) from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'geo_set_updated_at')::bigint,
    1::bigint
  union all
  select 'content_store row id=1',
    (select count(*) from public.content_store where id = 1)::bigint,
    1::bigint
)
select
  check_name,
  actual,
  expected,
  case when actual = expected then 'PASS' else 'FAIL' end as status
from metrics
order by check_name;

