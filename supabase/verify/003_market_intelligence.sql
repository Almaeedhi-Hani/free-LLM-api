-- =============================================================================
-- Phase 2 · Migration 003 · Post-apply verification (PASS/FAIL summary)
-- Run after applying 003_phase2_market_intelligence.sql.
-- Expected: all rows PASS.
-- =============================================================================

with
target(tbl) as (
  values
    ('competitors'), ('competitor_observations'), ('keywords'),
    ('opportunities'), ('agent_goals'), ('analysis_runs')
),
privs(priv) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
         ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
),
checks as (
  select 'Phase 2 tables = 6' as check_name, 6::bigint as expected,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relname in (select tbl from target))::bigint as actual
  union all
  select 'RLS enabled on all 6 tables', 6,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (select tbl from target) and c.relrowsecurity)::bigint
  union all
  select 'service_role SELECT on all 6 tables', 6,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'SELECT'))::bigint
  union all
  select 'service_role INSERT on all 6 tables', 6,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'INSERT'))::bigint
  union all
  select 'service_role UPDATE on all 6 tables', 6,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'UPDATE'))::bigint
  union all
  select 'service_role DELETE on all 6 tables', 6,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (select tbl from target)
        and has_table_privilege('service_role', c.oid, 'DELETE'))::bigint
  union all
  select 'anon privileges on Phase 2 tables = 0', 0,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      cross join privs p
      where n.nspname='public' and c.relname in (select tbl from target)
        and has_table_privilege('anon', c.oid, p.priv))::bigint
  union all
  select 'authenticated privileges on Phase 2 tables = 0', 0,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      cross join privs p
      where n.nspname='public' and c.relname in (select tbl from target)
        and has_table_privilege('authenticated', c.oid, p.priv))::bigint
  union all
  select 'geo_service_role_all policies = 6', 6,
    (select count(*) from pg_policies
      where schemaname='public' and policyname='geo_service_role_all'
        and tablename in (select tbl from target))::bigint
  union all
  select 'explicit indexes >= 11', 11,
    (select count(*) from pg_indexes
      where schemaname='public' and indexname in (
        'idx_competitors_domain','idx_competitors_status',
        'idx_competitor_observations_competitor','idx_competitor_observations_language',
        'idx_keywords_term_language','idx_keywords_intent',
        'idx_opportunities_status_priority','idx_opportunities_type',
        'idx_agent_goals_status_priority',
        'idx_analysis_runs_started_at','idx_analysis_runs_status'
      ))::bigint
  union all
  select 'competitors unique domain', 1,
    (select count(*) from pg_constraint where contype='u'
      and conrelid=to_regclass('public.competitors')
      and pg_get_constraintdef(oid)='UNIQUE (domain)')::bigint
  union all
  select 'keywords unique (term, language)', 1,
    (select count(*) from pg_constraint where contype='u'
      and conrelid=to_regclass('public.keywords')
      and pg_get_constraintdef(oid)='UNIQUE (term, language)')::bigint
  union all
  select 'opportunities unique (title, type)', 1,
    (select count(*) from pg_constraint where contype='u'
      and conrelid=to_regclass('public.opportunities')
      and pg_get_constraintdef(oid)='UNIQUE (title, type)')::bigint
  union all
  select 'agent_goals unique (title, opportunity)', 1,
    (select count(*) from pg_constraint where contype='u'
      and conrelid=to_regclass('public.agent_goals')
      and pg_get_constraintdef(oid)='UNIQUE (title, related_opportunity_id)')::bigint
  union all
  select 'competitor_observations unique', 1,
    (select count(*) from pg_constraint where contype='u'
      and conrelid=to_regclass('public.competitor_observations'))::bigint
  union all
  select 'updated_at triggers = 5', 5,
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
      where n.nspname='public' and not t.tgisinternal and p.proname='geo_set_updated_at'
        and t.tgname in ('trg_competitors_updated_at','trg_keywords_updated_at',
                        'trg_opportunities_updated_at','trg_agent_goals_updated_at',
                        'trg_analysis_runs_updated_at'))::bigint
  union all
  select 'content_store row count = 1 (unchanged)', 1,
    (select count(*) from public.content_store)::bigint
  union all
  select 'content_store md5(id=1) unchanged', 1,
    (select count(*) from public.content_store
      where id=1 and md5(content::text)='1d503088fd5ca4f15cc3ebf61a8cb5d3')::bigint
  union all
  select 'content_store RLS still enabled', 1,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='content_store' and c.relrowsecurity)::bigint
  union all
  select 'Phase 1 tables still 6', 6,
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r'
        and c.relname in ('site_pages','page_versions','audit_logs','agent_jobs','agent_runs','approval_requests'))::bigint
)
select
  check_name,
  expected,
  actual,
  case when actual = expected then 'PASS' else 'FAIL' end as status
from checks
union all
select 'SUMMARY: overall verdict', 0, (select count(*) from checks where actual <> expected),
  case when (select count(*) from checks where actual <> expected) = 0 then 'PASS' else 'FAIL' end
order by check_name;
