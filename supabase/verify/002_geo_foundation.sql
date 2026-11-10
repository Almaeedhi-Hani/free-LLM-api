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
  and conrelid::regclass::text in (
    'site_pages', 'page_versions', 'audit_logs',
    'agent_jobs', 'agent_runs', 'approval_requests'
  )
order by table_name::text, conname;

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
--    Capture updated_at BEFORE applying 002 and compare it with this output.
select id, updated_at, jsonb_typeof(content) as content_type
from public.content_store
where id = 1;
