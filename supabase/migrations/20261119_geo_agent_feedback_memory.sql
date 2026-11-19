-- Append-only GEO agent corrections: manual reviewer feedback, not model training.
-- No existing table, publication policy, quota or production data is changed.
create table if not exists public.geo_agent_feedback (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('keyword','competitor','opportunity','editorial','publication','faq')),
  subject_key text not null check (char_length(subject_key) between 2 and 500),
  language text check (language in ('ar','en','zh')),
  decision text not null check (decision in ('irrelevant','inaccurate','duplicate','valid')),
  reason text not null check (char_length(btrim(reason)) between 5 and 1000),
  source text not null default 'admin' check (source in ('admin','seed')),
  created_at timestamptz not null default now()
);
create index if not exists geo_agent_feedback_subject_idx
 on public.geo_agent_feedback(subject_type,subject_key,language,created_at desc,id desc);
create index if not exists geo_agent_feedback_recent_idx
 on public.geo_agent_feedback(created_at desc,id desc);
alter table public.geo_agent_feedback enable row level security;
revoke all on public.geo_agent_feedback from public,anon,authenticated;
grant select,insert on public.geo_agent_feedback to service_role;
-- Exact case from the user's explicit correction. Retain any older keyword rows,
-- opportunity history and published pages unchanged; future runs use latest decision.
insert into public.geo_agent_feedback(subject_type,subject_key,language,decision,reason,source)
select 'keyword','saudi arabia formation football','en','irrelevant',
 'مصطلح رياضي لا يتعلق بتأسيس الشركات أو الاستثمار الأجنبي','seed'
where not exists (
 select 1 from public.geo_agent_feedback
 where subject_type='keyword' and subject_key='saudi arabia formation football'
  and language='en' and decision='irrelevant' and source='seed'
);
