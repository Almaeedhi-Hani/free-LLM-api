-- Investor requests are private; public clients cannot read or write rows directly.
create table if not exists public.package_requests (
 id uuid primary key,
 created_at timestamptz not null default now(),
 package_slug text not null,
 package_price numeric(12,2) not null check (package_price >= 0),
 locale text not null check (locale in ('ar','en','zh')),
 name text not null,
 email text not null,
 phone text not null,
 country text not null default '',
 activity text not null,
 company text not null,
 budget text not null,
 notes text not null default '',
 status text not null default 'saved' check (status in ('saved','contacted','closed'))
);
alter table public.package_requests enable row level security;
revoke all on public.package_requests from anon, authenticated;
create index if not exists package_requests_created_at_idx on public.package_requests (created_at desc);
