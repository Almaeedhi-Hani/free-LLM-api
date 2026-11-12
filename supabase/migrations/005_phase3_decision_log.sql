-- Phase 3: decision log (NOT APPLIED, requires approval)
create table if not exists public.decision_logs (
  id uuid primary key default gen_random_uuid(),
  run_id text,
  stage text not null,
  model text,
  evidence_ids jsonb not null default '[]'::jsonb,
  decision text not null,
  rationale text,
  risk_level text,
  cost_usd numeric,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_corrections (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  correction text not null,
  created_by text,
  created_at timestamptz not null default now()
);
EOF
echo written