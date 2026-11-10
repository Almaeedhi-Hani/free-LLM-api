-- Phase 1: Foundation & Memory (GEO Intelligence Agent)
-- Tables: site_pages, page_versions, audit_logs, agent_jobs, agent_runs, approval_requests

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.site_pages(id) on delete cascade,
  version int not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  created_by text
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  actor text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null default 'pending',
  payload jsonb,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.agent_jobs(id) on delete set null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb,
  error text
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  proposed_content jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer text
);

-- Indexes
create index if not exists idx_site_pages_slug on public.site_pages(slug);
create index if not exists idx_page_versions_page_id on public.page_versions(page_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_agent_jobs_status on public.agent_jobs(status);
create index if not exists idx_approval_requests_status on public.approval_requests(status);

-- RLS
alter table public.site_pages enable row level security;
alter table public.page_versions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.agent_runs enable row level security;
alter table public.approval_requests enable row level security;

-- Grants for service_role only
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.site_pages to service_role;
grant select, insert, update, delete on table public.page_versions to service_role;
grant select, insert, update, delete on table public.audit_logs to service_role;
grant select, insert, update, delete on table public.agent_jobs to service_role;
grant select, insert, update, delete on table public.agent_runs to service_role;
grant select, insert, update, delete on table public.approval_requests to service_role;