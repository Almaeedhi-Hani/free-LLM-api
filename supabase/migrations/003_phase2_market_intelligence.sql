-- =============================================================================
-- Phase 2: Market & Competitor Intelligence (Market-Aware GEO Intelligence Agent)
-- Creates: competitors, competitor_observations, keywords, opportunities,
--          agent_goals, analysis_runs
--
-- Scope guarantees:
--   * Only NEW tables are created. Existing tables (content_store, site_pages,
--     page_versions, audit_logs, agent_jobs, agent_runs, approval_requests)
--     and their data are not read, altered, or dropped.
--   * RLS is enabled on every new table; no policies are granted to anon or
--     authenticated, so those roles are denied by default.
--   * service_role receives explicit table grants (Supabase no longer grants
--     these implicitly for new tables).
--   * No fabricated metrics: nullable volume columns; volume_source required
--     whenever a volume is stored.
--   * Safe to re-run: tables/indexes use IF NOT EXISTS, triggers and policies
--     are dropped/recreated explicitly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null unique,
  languages text[] not null default '{}',
  market text not null default 'saudi-company-formation',
  status text not null default 'active'
    check (status in ('active', 'inactive', 'disqualified')),
  source text not null default 'manual'
    check (source in ('manual', 'search', 'directory', 'referral')),
  notes text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.competitors is
  'Discovered competitor entities. Content is never copied; only metadata and evidence are stored.';

create table if not exists public.competitor_observations (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  observed_at timestamptz not null default now(),
  language text not null check (language in ('ar', 'en', 'zh')),
  query text not null,
  rank int check (rank is null or rank >= 1),
  title text,
  snippet text,
  url text,
  page_type text check (page_type is null or page_type in ('landing', 'service', 'blog', 'faq', 'other')),
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  raw jsonb,
  -- Idempotency guard for repeated radar runs with identical inputs.
  constraint competitor_observations_unique
    unique (competitor_id, observed_at, language, query)
);

comment on table public.competitor_observations is
  'Immutable evidence captured about a competitor at a point in time. Never copied content.';

create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  language text not null check (language in ('ar', 'en', 'zh')),
  intent text not null default 'informational'
    check (intent in ('informational', 'transactional', 'navigational', 'commercial')),
  cluster text,
  source text not null default 'manual',
  search_volume int check (search_volume is null or search_volume >= 0),
  volume_source text,
  volume_confidence text not null default 'unknown'
    check (volume_confidence in ('high', 'medium', 'low', 'unknown')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint keywords_volume_requires_source
    check (search_volume is null or volume_source is not null),
  constraint keywords_term_language_unique unique (term, language)
);

comment on table public.keywords is
  'Collected search terms with intent. Volumes are only stored with a named source; never fabricated.';

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null
    check (type in ('content_gap', 'keyword_gap', 'faq_gap', 'service_gap', 'authority_gap')),
  priority text not null default 'medium'
    check (priority in ('critical', 'high', 'medium', 'low')),
  score numeric(5,2) not null default 0
    check (score >= 0 and score <= 100),
  evidence jsonb not null default '[]'::jsonb,
  languages text[] not null default '{}',
  related_keywords uuid[] not null default '{}',
  related_competitors uuid[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'triaged', 'planned', 'done', 'rejected')),
  confidence text not null default 'low'
    check (confidence in ('high', 'medium', 'low')),
  estimated_impact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_title_type_unique unique (title, type)
);

comment on table public.opportunities is
  'Prioritized gaps and commercial opportunities backed by evidence.';

create table if not exists public.agent_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text not null default 'medium'
    check (priority in ('critical', 'high', 'medium', 'low')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'cancelled')),
  evidence jsonb not null default '[]'::jsonb,
  success_metrics jsonb not null default '[]'::jsonb,
  confidence text not null default 'low'
    check (confidence in ('high', 'medium', 'low')),
  related_opportunity_id uuid references public.opportunities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint agent_goals_title_opportunity_unique
    unique (title, related_opportunity_id)
);

comment on table public.agent_goals is
  'Measurable goals generated from opportunities.';

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null
    check (run_type in ('radar', 'keyword_collection', 'gap_analysis', 'goal_generation', 'full')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'failed', 'partial')),
  summary jsonb,
  error text,
  triggered_by text not null default 'manual'
    check (triggered_by in ('manual', 'cron', 'github_actions', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.analysis_runs is
  'Append-only history of market intelligence runs.';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_competitors_domain
  on public.competitors (domain);
create index if not exists idx_competitors_status
  on public.competitors (status);

create index if not exists idx_competitor_observations_competitor
  on public.competitor_observations (competitor_id, observed_at desc);
create index if not exists idx_competitor_observations_language
  on public.competitor_observations (language);

create index if not exists idx_keywords_term_language
  on public.keywords (term, language);
create index if not exists idx_keywords_intent
  on public.keywords (intent);

create index if not exists idx_opportunities_status_priority
  on public.opportunities (status, priority);
create index if not exists idx_opportunities_type
  on public.opportunities (type);

create index if not exists idx_agent_goals_status_priority
  on public.agent_goals (status, priority);

create index if not exists idx_analysis_runs_started_at
  on public.analysis_runs (started_at desc);
create index if not exists idx_analysis_runs_status
  on public.analysis_runs (status);

-- -----------------------------------------------------------------------------
-- updated_at maintenance (reuse Phase 1 function)
-- -----------------------------------------------------------------------------

drop trigger if exists trg_competitors_updated_at on public.competitors;
create trigger trg_competitors_updated_at
  before update on public.competitors
  for each row execute function public.geo_set_updated_at();

drop trigger if exists trg_keywords_updated_at on public.keywords;
create trigger trg_keywords_updated_at
  before update on public.keywords
  for each row execute function public.geo_set_updated_at();

drop trigger if exists trg_opportunities_updated_at on public.opportunities;
create trigger trg_opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.geo_set_updated_at();

drop trigger if exists trg_agent_goals_updated_at on public.agent_goals;
create trigger trg_agent_goals_updated_at
  before update on public.agent_goals
  for each row execute function public.geo_set_updated_at();

drop trigger if exists trg_analysis_runs_updated_at on public.analysis_runs;
create trigger trg_analysis_runs_updated_at
  before update on public.analysis_runs
  for each row execute function public.geo_set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.competitors enable row level security;
alter table public.competitor_observations enable row level security;
alter table public.keywords enable row level security;
alter table public.opportunities enable row level security;
alter table public.agent_goals enable row level security;
alter table public.analysis_runs enable row level security;

revoke all on table public.competitors from anon, authenticated;
revoke all on table public.competitor_observations from anon, authenticated;
revoke all on table public.keywords from anon, authenticated;
revoke all on table public.opportunities from anon, authenticated;
revoke all on table public.agent_goals from anon, authenticated;
revoke all on table public.analysis_runs from anon, authenticated;

drop policy if exists geo_service_role_all on public.competitors;
create policy geo_service_role_all on public.competitors
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.competitor_observations;
create policy geo_service_role_all on public.competitor_observations
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.keywords;
create policy geo_service_role_all on public.keywords
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.opportunities;
create policy geo_service_role_all on public.opportunities
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.agent_goals;
create policy geo_service_role_all on public.agent_goals
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.analysis_runs;
create policy geo_service_role_all on public.analysis_runs
  for all to service_role using (true) with check (true);

-- -----------------------------------------------------------------------------
-- Grants (explicit, service_role only)
-- -----------------------------------------------------------------------------

grant select, insert, update, delete on table public.competitors to service_role;
grant select, insert, update, delete on table public.competitor_observations to service_role;
grant select, insert, update, delete on table public.keywords to service_role;
grant select, insert, update, delete on table public.opportunities to service_role;
grant select, insert, update, delete on table public.agent_goals to service_role;
grant select, insert, update, delete on table public.analysis_runs to service_role;
