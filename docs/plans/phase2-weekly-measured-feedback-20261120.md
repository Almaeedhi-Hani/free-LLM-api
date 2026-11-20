# V3 Stage 2 — measured weekly keyword-feedback and page-day evidence

Date: 2026-11-20. This is an increment to the existing Sunday operations report, not final Phase-2 acceptance.

## Source verification (direct read-only Supabase, ~17:09 UTC)

- `public.geo_agent_feedback`: last seven days has **10 existing `keyword` records marked `irrelevant`**. This is a **record of decisions/feedback**, not proof of 10 newly generated keywords rejected by an automated relevance filter. No `accepted` decisions are present in this particular window; absence of rows does **not** prove that all keywords were rejected.
- `public.gsc_daily_metrics`: latest `dimension=total` on **2026-11-17** is **3 impressions and 0 clicks**. The `dimension=page` table has one measured page-day record for `/en/services/misa-license` on the same date, **3 impressions, 0 clicks, average GSC position 3**. This is Google's measured average for one sample and **not** a verified live #3 SERP placement, 7-day traffic total, or conversion.
- Country, device, page and total dimensions can repeat the same 3 impressions; **never sum them**. No `query` grain was found in the inspected date range; do not invent query opportunities.

## Implementation

The existing Sunday `[V3 weekly]` GitHub Issue generator adds two bounded, read-only PostgREST fetches that use its already-configured **server-side GitHub Actions secret** `SUPABASE_SERVICE_ROLE_KEY` without echoing it or placing it in the browser:
1. `geo_agent_feedback` from the last exact seven days, filtered to `subject_type=keyword`, maximum 501 records to detect incomplete/truncated counts (500 or fewer is accepted). It reports the explicit recorded decisions with sanitized labels only, not a synthetic acceptance rate. If missing/auth-failed/too many/invalid, reports **unknown**.
2. A maximum five `gsc_daily_metrics` records from `dimension=page` in the last seven days, ordered by impressions. The report shows a single highest-impression **page-day observation**, never a weekly aggregate, and only when its URL belongs to the verified own-origin, has a safe path, nonnegative metrics, valid date and valid optional average position. Unknown/untrusted rows are omitted.

The existing `dimension=total` daily readback and no-invention language continue unchanged. AI citation visibility and daily provider usage stay **unknown** absent explicit evidence. A healthy GitHub job is not a substitute for W01-W04 actual storage freshness; the separate Watchdog handles that after [PR #210](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/210).

Offline tests assert exact PostgREST filter fields, measured counts, exclusion of foreign-domain pages, missing credentials, truncation and actual Sunday Issue text without contacting GitHub/Supabase/provider networks.

## Not yet claimed

- PR CI, browser/Evals and postmerge production acceptance must pass before any release statement.
- The **actual scheduled Sunday report** is next due **2026-11-22 06:00 UTC (09:00 KSA)** and may run late. A passing test or manually created issue **does not** prove scheduled delivery.
- First legitimate six-hour watchdog (`17 */6 * * *`), quality-watch schedule, owner-safe Master Pause UI, and 80%-daily atomic provider quota reservations remain separate Stage-2 acceptance gates.
- No DB migration, RLS or schema changes, no provider calls, no new public content, no workflow cron change, no publishing policy change or hidden agent sessions.
