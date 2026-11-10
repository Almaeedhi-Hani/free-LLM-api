# Migration 002 — Preflight Result

- **Project:** `investor-geo` (`nqryjtohneqjehqmddki`)
- **Executed:** 2026-11-10 15:30:39 UTC
- **Where:** Supabase SQL Editor, authorized dashboard session (`current_user = postgres`)
- **Server:** PostgreSQL 17.11 (`server_version_num = 170011`)
- **Query:** `supabase/verify/002_preflight.sql` (read-only, single statement)
- **Migration under test:** `supabase/migrations/002_geo_foundation.sql`
  SHA-256 `469D4093F12F563BBD59C187294C67422EBC572390220180FE2B6E8B9E058FEB`

## Verdict

**PASS — 46 of 46 checks passed, 0 FAIL.**

| Category | Checks | Result |
|---|---:|---|
| ENV — environment prerequisites | 6 | 6 PASS |
| TBL — six target tables absent | 6 | 6 PASS |
| IDX — index/constraint relation names free | 17 | 17 PASS |
| CON — inline PK/UNIQUE constraints free | 8 | 8 PASS |
| FUNC — `geo_set_updated_at` compatibility | 1 | 1 PASS |
| TRG — trigger names free on target tables | 1 | 1 PASS |
| POL — policy name free on target tables | 1 | 1 PASS |
| CS — `content_store` untouched baseline | 5 | 5 PASS |
| SUMMARY — computed FAIL count | 1 | 0 FAIL |
| **Total** | **46** | **46 PASS** |

## Key values

| Check | Actual |
|---|---|
| PostgreSQL | 17.11 |
| Connected database / role | `postgres` / `postgres` |
| `CREATE` on schema `public` | true |
| `gen_random_uuid()` available | true |
| Required roles | `anon, authenticated, service_role` |
| `content_store` columns | `content:jsonb`, `id:integer`, `updated_at:timestamptz` |
| `content_store` RLS | enabled |
| `content_store` rows | 1 |
| `content_store` md5 for `id = 1` | `1d503088fd5ca4f15cc3ebf61a8cb5d3` |

## Note on default ACLs (ENV-06)

`public` has default ACLs granting `anon` and `authenticated` privileges on newly
created tables (inherited Supabase defaults). Migration 002 creates its tables and
then explicitly runs `revoke all on table ... from anon, authenticated`, so those
inherited grants are removed. This was already part of the migration; the check
confirms the behavior is needed and covered.

## Artifacts

- Preflight query: `supabase/verify/002_preflight.sql`
- Post-migration verification: `supabase/verify/002_geo_foundation.sql`
  (24-row PASS/FAIL summary; validated pre-migration to fail closed)
- Migration: `supabase/migrations/002_geo_foundation.sql` (not applied)

The post-migration verifier was executed against the pre-migration database and
correctly returned 16 FAIL rows for the missing objects and 8 PASS rows for the
`content_store`/schema prerequisites and the default anon/authenticated denial
(no tables existed yet). It is expected to return 24 PASS rows after the
migration is applied.
