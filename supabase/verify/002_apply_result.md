# Migration 002 — Apply & Verify Result

- **Project:** `investor-geo` (`nqryjtohneqjehqmddki`)
- **Applied:** 2026-11-10 15:34:37 UTC, Supabase SQL Editor (`current_user = postgres`)
- **Migration:** `supabase/migrations/002_geo_foundation.sql`
- **SHA-256 (verified before apply):**
  `469D4093F12F563BBD59C187294C67422EBC572390220180FE2B6E8B9E058FEB`
- **Apply response:** `[]` (no rows) — editor reported “Success. No rows returned”
- **Executions:** exactly one

## Verification — `supabase/verify/002_geo_foundation.sql`

- **Executed:** 2026-11-10 15:35:52 UTC
- **Result:** **24 of 24 checks PASS, 0 FAIL**

| Check | Actual | Expected | Status |
|---|---:|---:|---|
| Phase 1 tables | 6 | 6 | PASS |
| RLS enabled on all 6 tables | 6 | 6 | PASS |
| service_role SELECT on all 6 tables | 6 | 6 | PASS |
| service_role INSERT on all 6 tables | 6 | 6 | PASS |
| service_role UPDATE on all 6 tables | 6 | 6 | PASS |
| service_role DELETE on all 6 tables | 6 | 6 | PASS |
| anon privileges on new tables | 0 | 0 | PASS |
| authenticated privileges on new tables | 0 | 0 | PASS |
| service_role USAGE on schema public | 1 | 1 | PASS |
| geo_service_role_all policies | 6 | 6 | PASS |
| all new-table policies limited to service_role | 6 | 6 | PASS |
| primary keys | 6 | 6 | PASS |
| UNIQUE (page_id, version) | 1 | 1 | PASS |
| UNIQUE (site_pages.slug) | 1 | 1 | PASS |
| status CHECK constraints | 4 | 4 | PASS |
| page_versions version check | 1 | 1 | PASS |
| explicit indexes | 9 | 9 | PASS |
| `geo_set_updated_at()` trigger function | 1 | 1 | PASS |
| updated_at triggers (BEFORE ROW UPDATE) | 2 | 2 | PASS |
| content_store exists | 1 | 1 | PASS |
| content_store columns id/content/updated_at | 3 | 3 | PASS |
| content_store row count (baseline) | 1 | 1 | PASS |
| content_store md5(id = 1) unchanged | 1 | 1 | PASS |
| content_store RLS still enabled | 1 | 1 | PASS |

> Note: the earlier plan said “23 checks”; the expanded verifier actually
> contains **24** checks. All 24 pass. No check was removed or skipped.

## `content_store` integrity

- **Checked:** 2026-11-10 15:36:44 UTC
- Row count: **1** (baseline: 1)
- `md5(content)` for `id = 1`: **`1d503088fd5ca4f15cc3ebf61a8cb5d3`** (matches preflight baseline)
- RLS: **enabled** (unchanged)
- Columns `id`, `content`, `updated_at`: **present** (3)
- `updated_at` for `id = 1`: `2026-11-10 13:07:53.892+00` (predates the migration; unchanged)

The migration created only new objects and did not read, alter, or drop
`content_store`.

## Boundaries respected

- No GitHub push
- No Render deployment
- No Cron execution
- No production data writes beyond the approved migration DDL
