-- =============================================================================
-- Phase 1: Foundation & Memory (Market-Aware GEO Intelligence Agent)
-- Creates: site_pages, page_versions, audit_logs, agent_jobs, agent_runs,
--          approval_requests
--
-- Scope guarantees:
--   * Only NEW tables are created. The existing public.content_store table and
--     its data are not read, altered, or dropped by this migration.
--   * RLS is enabled on every new table; no policies are granted to anon or
--     authenticated, so those roles are denied by default.
--   * service_role receives explicit table grants (Supabase no longer grants
--     these implicitly for new tables).
--   * Safe to re-run: tables/indexes use IF NOT EXISTS, triggers and policies
--     are dropped/recreated explicitly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  version int not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.site_pages is
  'Current state of each managed page. History lives in page_versions.';

create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.site_pages(id) on delete cascade,
  version int not null check (version >= 1),
  content jsonb not null,
  created_at timestamptz not null default now(),
  created_by text,
  -- One row per page version: also the database-level guard for optimistic
  -- locking. A concurrent writer cannot create a duplicate version.
  constraint page_versions_page_version_key unique (page_id, version)
);

comment on table public.page_versions is
  'Immutable snapshot of a page at each version, used for diff and rollback.';

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  actor text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only trail of every create/update/rollback/job/approval action.';

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  payload jsonb,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.agent_jobs is
  'Resumable unit of agent work; survives restarts.';

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.agent_jobs(id) on delete set null,
  status text not null default 'running'
    check (status in ('running', 'success', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb,
  error text
);

comment on table public.agent_runs is
  'One execution attempt of an agent job, including outcome and errors.';

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  proposed_content jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer text
);

comment on table public.approval_requests is
  'Human-review queue for high-risk changes before they are published.';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- site_pages.slug already has a unique index via the UNIQUE constraint.
create index if not exists idx_page_versions_page_version
  on public.page_versions (page_id, version desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity
  on public.audit_logs (entity_type, entity_id);

create index if not exists idx_agent_jobs_status_scheduled
  on public.agent_jobs (status, scheduled_at);

create index if not exists idx_agent_runs_job
  on public.agent_runs (job_id);
create index if not exists idx_agent_runs_started_at
  on public.agent_runs (started_at desc);

create index if not exists idx_approval_requests_status
  on public.approval_requests (status);
create index if not exists idx_approval_requests_entity
  on public.approval_requests (entity_type, entity_id);

-- Prevent two simultaneous pending reviews for the same entity (duplicates).
create unique index if not exists uniq_pending_approval_per_entity
  on public.approval_requests (entity_type, entity_id)
  where status = 'pending';

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------

create or replace function public.geo_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_pages_updated_at on public.site_pages;
create trigger trg_site_pages_updated_at
  before update on public.site_pages
  for each row execute function public.geo_set_updated_at();

drop trigger if exists trg_agent_jobs_updated_at on public.agent_jobs;
create trigger trg_agent_jobs_updated_at
  before update on public.agent_jobs
  for each row execute function public.geo_set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.site_pages enable row level security;
alter table public.page_versions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.agent_runs enable row level security;
alter table public.approval_requests enable row level security;

-- No policies for anon/authenticated: default deny. Revoke any inherited
-- privileges explicitly for defense in depth.
revoke all on table public.site_pages from anon, authenticated;
revoke all on table public.page_versions from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.agent_jobs from anon, authenticated;
revoke all on table public.agent_runs from anon, authenticated;
revoke all on table public.approval_requests from anon, authenticated;

-- service_role normally bypasses RLS, but an explicit policy keeps access
-- correct even if BYPASSRLS is ever removed.
drop policy if exists geo_service_role_all on public.site_pages;
create policy geo_service_role_all on public.site_pages
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.page_versions;
create policy geo_service_role_all on public.page_versions
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.audit_logs;
create policy geo_service_role_all on public.audit_logs
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.agent_jobs;
create policy geo_service_role_all on public.agent_jobs
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.agent_runs;
create policy geo_service_role_all on public.agent_runs
  for all to service_role using (true) with check (true);

drop policy if exists geo_service_role_all on public.approval_requests;
create policy geo_service_role_all on public.approval_requests
  for all to service_role using (true) with check (true);

-- -----------------------------------------------------------------------------
-- Grants (explicit, service_role only)
-- -----------------------------------------------------------------------------

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.site_pages to service_role;
grant select, insert, update, delete on table public.page_versions to service_role;
grant select, insert, update, delete on table public.audit_logs to service_role;
grant select, insert, update, delete on table public.agent_jobs to service_role;
grant select, insert, update, delete on table public.agent_runs to service_role;
grant select, insert, update, delete on table public.approval_requests to service_role;
