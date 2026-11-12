-- Phase 3: formalize origin column on opportunities/agent_goals
-- NOT APPLIED. Requires approval. Run preflight first.

alter table public.opportunities
  add column if not exists origin text not null default 'keyword'
  check (origin in ('keyword','competitor','manual'));

alter table public.agent_goals
  add column if not exists origin text not null default 'keyword'
  check (origin in ('keyword','competitor','manual'));

-- backfill from evidence JSON if present
update public.opportunities
set origin = coalesce(
  (select (e->>'origin') from jsonb_array_elements(evidence) as e where e->>'origin' is not null limit 1),
  'keyword'
)
where origin = 'keyword';
EOF
echo written