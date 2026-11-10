-- =============================================================================
-- Phase 1 preflight (READ-ONLY, safe to run before migration 002)
--
-- Purpose:
--   1. Confirm you are connected to the intended project (check the project
--      selector in the Supabase Dashboard shows "investor-geo").
--   2. Confirm none of the six Phase 1 tables already exist.
--   3. Detect conflicting object names that migration 002 would create.
--   4. Confirm required roles exist.
--   5. Capture a content_store snapshot for before/after comparison.
--
-- No statement below writes, creates, alters, or deletes anything.
-- If any "already_exists" value is true for a Phase 1 table, STOP and report it
-- before applying the migration.
-- =============================================================================

-- 1) Connection identity ------------------------------------------------------
select
  current_database()                as database_name,
  current_user                      as db_user,
  current_setting('server_version') as postgres_version,
  now()                             as checked_at;

-- 2) Phase 1 tables must NOT exist yet ---------------------------------------
select
  expected.name,
  (to_regclass('public.' || expected.name) is not null) as already_exists
from (values
  ('site_pages'),
  ('page_versions'),
  ('audit_logs'),
  ('agent_jobs'),
  ('agent_runs'),
  ('approval_requests')
) as expected(name)
order by expected.name;

-- 3) Conflicting object names ------------------------------------------------
select 'function' as object_kind, 'geo_set_updated_at' as object_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'geo_set_updated_at'
       ) as already_exists
union all
select 'constraint', 'page_versions_page_version_key',
       exists (
         select 1 from pg_constraint
         where conname = 'page_versions_page_version_key'
           and connamespace = 'public'::regnamespace
       )
union all
select 'index', 'uniq_pending_approval_per_entity',
       exists (
         select 1 from pg_indexes
         where schemaname = 'public' and indexname = 'uniq_pending_approval_per_entity'
       )
union all
select 'trigger', 'trg_site_pages_updated_at',
       exists (
         select 1 from pg_trigger
         where tgname = 'trg_site_pages_updated_at'
           and not tgisinternal
       )
union all
select 'trigger', 'trg_agent_jobs_updated_at',
       exists (
         select 1 from pg_trigger
         where tgname = 'trg_agent_jobs_updated_at'
           and not tgisinternal
       )
union all
select 'policy', 'geo_service_role_all',
       exists (
         select 1 from pg_policies
         where schemaname = 'public' and policyname = 'geo_service_role_all'
       );

-- 4) Required roles -----------------------------------------------------------
select
  required.rolname,
  (pg_roles.rolname is not null) as present
from (values ('anon'), ('authenticated'), ('service_role')) as required(rolname)
left join pg_roles on pg_roles.rolname = required.rolname
order by required.rolname;

-- 5) UUID generator availability ---------------------------------------------
select
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'gen_random_uuid'
  ) as gen_random_uuid_available;

-- 6) content_store baseline ---------------------------------------------------
-- SAVE these two values before applying migration 002, then compare them with
-- the same query in 002_geo_foundation.sql (section 8) afterwards.
select
  id,
  updated_at,
  md5(content::text) as content_md5
from public.content_store
order by id;
