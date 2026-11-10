-- =============================================================================
-- Phase 2 · Migration 003 · READ-ONLY preflight
-- Project: investor-geo
-- Scope: SELECT-only. Nothing is created, altered, inserted, or deleted.
-- Verifies that none of the six Phase 2 tables/indexes/constraints/policies
-- already exist before applying 003_phase2_market_intelligence.sql.
-- Expected before applying: every row PASS, SUMMARY actual = 0.
-- =============================================================================

with
target_tables(name) as (
  values
    ('competitors'), ('competitor_observations'), ('keywords'),
    ('opportunities'), ('agent_goals'), ('analysis_runs')
),
target_indexes(name) as (
  values
    ('competitors_pkey'), ('competitors_domain_key'),
    ('competitor_observations_pkey'), ('competitor_observations_unique'),
    ('keywords_pkey'), ('keywords_term_language_unique'),
    ('opportunities_pkey'), ('opportunities_title_type_unique'),
    ('agent_goals_pkey'), ('agent_goals_title_opportunity_unique'),
    ('analysis_runs_pkey'),
    ('idx_competitors_domain'), ('idx_competitors_status'),
    ('idx_competitor_observations_competitor'), ('idx_competitor_observations_language'),
    ('idx_keywords_term_language'), ('idx_keywords_intent'),
    ('idx_opportunities_status_priority'), ('idx_opportunities_type'),
    ('idx_agent_goals_status_priority'),
    ('idx_analysis_runs_started_at'), ('idx_analysis_runs_status')
),
checks as (
  select 10 + row_number() over (order by name) as ord, 'TBL-' || name as check_id,
         'tables' as category, name || ' must not exist yet' as check_name,
         'absent' as expected, coalesce(to_regclass('public.' || name)::text, 'absent') as actual,
         case when to_regclass('public.' || name) is null then 'PASS' else 'FAIL' end as status,
         'CREATE TABLE IF NOT EXISTS would silently skip' as details
  from target_tables
  union all
  select 200 + row_number() over (order by name), 'IDX-' || name, 'indexes',
         'index ' || name || ' must be free', 'absent',
         coalesce(to_regclass('public.' || name)::text, 'absent'),
         case when to_regclass('public.' || name) is null then 'PASS' else 'FAIL' end,
         'CREATE INDEX IF NOT EXISTS would silently skip'
  from target_indexes
  union all
  select 400, 'POL-01', 'policies', 'no geo_service_role_all on Phase 2 tables', '0',
    (select count(*)::text from pg_policies
      where schemaname='public' and policyname='geo_service_role_all'
        and tablename in (select name from target_tables)),
    case when (select count(*) from pg_policies
                where schemaname='public' and policyname='geo_service_role_all'
                  and tablename in (select name from target_tables)) = 0
         then 'PASS' else 'FAIL' end,
    'policy name conflict'
  union all
  select 410, 'FUNC-01', 'function', 'geo_set_updated_at() exists (Phase 1)', 'present',
    case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                      where n.nspname='public' and p.proname='geo_set_updated_at')
         then 'present' else 'MISSING' end,
    case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                      where n.nspname='public' and p.proname='geo_set_updated_at')
         then 'PASS' else 'FAIL' end,
    'reused by Phase 2 triggers'
  union all
  select 500, 'CS-01', 'content_store', 'content_store untouched', 'unchanged',
    (select count(*)::text from public.content_store),
    'PASS',
    'Phase 2 migration must not touch content_store'
)
select check_id, category, check_name, expected, actual, status, details
from (
  select ord, check_id, category, check_name, expected, actual, status, details from checks
  union all
  select 999999, 'SUMMARY', 'summary', 'overall preflight verdict', '0 FAIL rows',
    (select count(*)::text from checks where status='FAIL'),
    case when (select count(*) from checks where status='FAIL') = 0 then 'PASS' else 'FAIL' end,
    'computed from this result set only'
) all_checks
order by ord, check_id;
