# Supabase Setup (Optional Persistent Content Store)

The app supports an optional Supabase (PostgreSQL) backend for the dynamic content store. If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the app uses Supabase; otherwise it falls back to a local JSON file (ephemeral on Render).

## 1. Create Supabase Project
- Go to https://supabase.com → New Project.
- Copy **Project URL** and **service_role key** (Settings → API).

## 2. Create Table
Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.content_store (
  id int primary key,
  content jsonb not null,
  updated_at timestamptz default now()
);

-- seed initial row
insert into public.content_store (id, content)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
```

## 3. Configure Environment
Set in Render (and locally in `.env`):
- `SUPABASE_URL=https://<project>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<service_role_key>`
- `SUPABASE_TABLE=content_store` (optional)

## 4. Verify
- `GET /api/admin/content` with `x-admin-secret` → returns stored content.
- `POST /api/admin/content` → persists across restarts.

## Notes
- The service_role key is secret; never expose to client.
- Row-level security (RLS) can be enabled; service_role bypasses RLS.
- Without Supabase, content resets on Render restart (file store is ephemeral).