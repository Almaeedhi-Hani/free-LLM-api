-- Owner-only strategic memory and exact-item approval intents.
create table public.telegram_ops_memory (
 id uuid primary key default gen_random_uuid(),
 owner_id text not null check (owner_id ~ '^[0-9]{1,16}$'),
 decision text not null check (length(decision) between 1 and 1000),
 source text not null default 'owner_telegram',
 update_id bigint not null,
 created_at timestamptz not null default now(),
 archived_at timestamptz,
 unique(owner_id,update_id)
);
create table public.telegram_ops_review_intents (
 code text primary key check (code ~ '^[a-f0-9]{16}$'),
 owner_id text not null check (owner_id ~ '^[0-9]{1,16}$'),
 item_key text not null check (item_key ~ '^[a-f0-9]{24}$'),
 item_kind text not null check (item_kind in ('faq','editorial')),
 decision text not null check (decision in ('approve','reject')),
 content_version text not null,
 state text not null default 'pending' check (state in ('pending','claimed','applied','blocked','uncertain')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 completed_at timestamptz,
 outcome text
);
alter table public.telegram_ops_memory enable row level security;
alter table public.telegram_ops_review_intents enable row level security;
revoke all on public.telegram_ops_memory,public.telegram_ops_review_intents from public,anon,authenticated;
grant select,insert,update on public.telegram_ops_memory,public.telegram_ops_review_intents to service_role;
