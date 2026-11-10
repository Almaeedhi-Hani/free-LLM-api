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
--    Baseline captured by 002_preflight.sql before applying 002:
--      row count      = 1
--      md5(id = 1)    = 1d503088fd5ca4f15cc3ebf61a8cb5d3
--      RLS enabled    = true
--    Compare this output with the baseline; the migration must not change it.
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
--     Uses explicit role checks (has_table_privilege) instead of
--     information_schema, so results do not depend on the current role's
--     membership. Expected: 24 rows, all PASS.
with target(tbl) as (
  values
    ('site_pages'), ('page_versions'), ('audit_logs'),
    ('agent_jobs'), ('agent_runs'), ('approval_requests')
),
privs(priv) as (
  values
    ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
    ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
),
metrics as (
  select
    'Phase 1 tables = 6' as check_name,
    6::bigint as expected,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname in (select tbl from target))::bigint as actual
  union all
  select
    'RLS enabled on all 6 tables', 6,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (select tbl from target)
        and c.relrowsecurity)::bigint
  union all
  select
    'service_role SELECT on all 6 tables', 6,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'SELECT'))::bigint
  union all
  select
    'service_role INSERT on all 6 tables', 6,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'INSERT'))::bigint
  union all
  select
    'service_role UPDATE on all 6 tables', 6,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'UPDATE'))::bigint
  union all
  select
    'service_role DELETE on all 6 tables', 6,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'DELETE'))::bigint
  union all
  select
    'anon privileges on new tables = 0', 0,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       cross join privs p
      where n.nspname = 'public'
        and c.relname in (select tbl from target)
        and has_table_privilege('anon', c.oid, p.priv))::bigint
  union all
  select
    'authenticated privileges on new tables = 0', 0,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       cross join privs p
      where n.nspname = 'public'
        and c.relname in (select tbl from target)
        and has_table_privilege('authenticated', c.oid, p.priv))::bigint
  union all
  select
    'service_role USAGE on schema public', 1,
    (case when has_schema_privilege('service_role', 'public', 'USAGE')
          then 1 else 0 end)::bigint
  union all
  select
    'geo_service_role_all policies = 6', 6,
    (select count(*)
       from pg_policies
      where schemaname = 'public'
        and policyname = 'geo_service_role_all'
        and tablename in (select tbl from target))::bigint
  union all
  select
    'all new-table policies limited to service_role', 6,
    (select count(*)
       from pg_policies
      where schemaname = 'public'
        and tablename in (select tbl from target)
        and 'service_role' = any(roles)
        and not ('anon' = any(roles) or 'authenticated' = any(roles)))::bigint
  union all
  select
    'primary keys = 6', 6,
    (select count(*)
       from pg_constraint c
       join pg_class t on t.oid = c.conrelid
       join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname in (select tbl from target)
        and c.contype = 'p')::bigint
  union all
  select
    'UNIQUE (page_id, version)', 1,
    (select count(*)
       from pg_constraint
      where contype = 'u'
        and conrelid = to_regclass('public.page_versions')
        and pg_get_constraintdef(oid) = 'UNIQUE (page_id, version)')::bigint
  union all
  select
    'UNIQUE (site_pages.slug)', 1,
    (select count(*)
       from pg_constraint
      where contype = 'u'
        and conrelid = to_regclass('public.site_pages')
        and pg_get_constraintdef(oid) = 'UNIQUE (slug)')::bigint
  union all
  select
    'status CHECK constraints = 4', 4,
    (select count(*)
       from pg_constraint
      where contype = 'c'
        and conname in (
          'site_pages_status_check',
          'agent_jobs_status_check',
          'agent_runs_status_check',
          'approval_requests_status_check'
        ))::bigint
  union all
  select
    'page_versions version check', 1,
    (select count(*)
       from pg_constraint
      where contype = 'c'
        and conname = 'page_versions_version_check'
        and conrelid = to_regclass('public.page_versions'))::bigint
  union all
  select
    'explicit indexes = 9', 9,
    (select count(*)
       from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'idx_page_versions_page_version',
          'idx_audit_logs_created_at',
          'idx_audit_logs_entity',
          'idx_agent_jobs_status_scheduled',
          'idx_agent_runs_job',
          'idx_agent_runs_started_at',
          'idx_approval_requests_status',
          'idx_approval_requests_entity',
          'uniq_pending_approval_per_entity'
        ))::bigint
  union all
  select
    'geo_set_updated_at() trigger function', 1,
    (select count(*)
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'geo_set_updated_at'
        and p.pronargs = 0
        and p.prorettype = 'trigger'::regtype)::bigint
  union all
  select
    'updated_at triggers (BEFORE ROW UPDATE) = 2', 2,
    (select count(*)
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
       join pg_proc p on p.oid = t.tgfoid
      where n.nspname = 'public'
        and not t.tgisinternal
        and (
          (c.relname = 'site_pages' and t.tgname = 'trg_site_pages_updated_at')
          or
          (c.relname = 'agent_jobs' and t.tgname = 'trg_agent_jobs_updated_at')
        )
        and p.proname = 'geo_set_updated_at'
        and (t.tgtype & 2) = 2
        and (t.tgtype & 16) = 16)::bigint
  union all
  select
    'content_store exists', 1,
    (case when to_regclass('public.content_store') is not null
          then 1 else 0 end)::bigint
  union all
  select
    'content_store columns id/content/updated_at = 3', 3,
    (select count(*)
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'content_store'
        and column_name in ('id', 'content', 'updated_at'))::bigint
  union all
  select
    'content_store row count = 1 (baseline)', 1,
    (select count(*) from public.content_store)::bigint
  union all
  select
    'content_store md5(id = 1) unchanged', 1,
    (select count(*)
       from public.content_store
      where id = 1
        and md5(content::text) = '1d503088fd5ca4f15cc3ebf61a8cb5d3')::bigint
  union all
  select
    'content_store RLS still enabled', 1,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'content_store'
        and c.relrowsecurity)::bigint
)
select
  check_name,
  actual,
  expected,
  case when actual = expected then 'PASS' else 'FAIL' end as status
from metrics
order by check_name;

