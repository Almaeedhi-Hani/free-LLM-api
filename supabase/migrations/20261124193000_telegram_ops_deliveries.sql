-- Durable delivery claims, never exposed to browser roles.
create table if not exists public.telegram_ops_deliveries (
 delivery_key text primary key check (length(delivery_key) between 1 and 200),
 kind text not null check (kind in ('daily','alert','command')),
 state text not null default 'claimed' check (state in ('claimed','sent','uncertain')),
 claimed_at timestamptz not null default now(),
 sent_at timestamptz,
 telegram_message_id bigint
);
alter table public.telegram_ops_deliveries enable row level security;
revoke all on table public.telegram_ops_deliveries from public, anon, authenticated;
grant select, insert, update on table public.telegram_ops_deliveries to service_role;
