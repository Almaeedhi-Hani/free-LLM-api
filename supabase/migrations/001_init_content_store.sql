-- Content store for dynamic LLM/AIO content (FAQs, keywords, drafts, golden paragraph)
create table if not exists public.content_store (
  id int primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Seed initial row
insert into public.content_store (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Enable RLS (deny public access; service role bypasses)
alter table public.content_store enable row level security;

-- No policies for anon/authenticated => deny all (service role can still access)
-- Optional: allow read for authenticated users (uncomment if needed)
-- create policy "read_content" on public.content_store for select to authenticated using (true);