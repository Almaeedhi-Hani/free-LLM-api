# V3 GSC missing-day backfill: staged technical contract

Issue #145. This PR contributes a deterministic **read-only planner** and regression suite.
It does **not** activate retries, change the existing GSC endpoint or cron, perform SQL writes, or invent page/query measurements.

## Observed production state on 2026-11-19
- Current `src/app/api/cron-gsc/route.ts` collects **only UTC today minus three days**.
- Existing `gsc_daily_metrics` holds a separate `dimension` column; do not create a duplicate `gsc_daily` table without confirming grain and ownership.
- Latest observed day in Supabase: 2026-11-16, `dimension='total'`. Page and query observations were not present in the inspected recent dates. A stored site total does not imply granular data.
- Existing shared `scheduled-cadence-gate.cjs` relies on actual GitHub Actions start hour; delayed scheduled jobs can be skipped. Correct this independently while preserving the exact existing KSA two-hour / four-hour cadence.

## Planner contract
- Only complete UTC days through **today minus three days** can be scheduled.
- Missing day => `missing` target, **not proof of a prior failed attempt**.
- `failed` => retry no sooner than one day after last check.
- `success_no_data` => ordinary successful empty response; check again after three days initially, then after seven days. This is never counted as failure.
- `success_with_data` => never refetch without a separately requested refresh.
- Bound backlog candidates: maximum ten per run, 45-day default lookback, no synthetic metrics.

## Required remaining integration (not yet implemented)
1. Select a verified persistence location for per-date `status`, `checked_at`, `rows_fetched` and `attempts`. Database schema/policy change requires explicit owner approval; do not silently add a table or co-opt a wrong table.
2. Read existing metric rows and recorded sync attempts, then call `planGscCatchup`. Missing date in `gsc_daily_metrics` alone cannot distinguish no traffic from failed sync.
3. Run bounded sequential day fetches with current `collectGscDimensionRows`, preserve its row ceiling, and distinguish total/page/query/country/device **without aggregating different dimensions together**.
4. Persist successful results and per-day states transactionally with readback; an unsuccessful write cannot be reported as a success. Avoid repeated speculative writes.
5. Fix delayed schedule detection in the existing gate without changing approved operational cadence; test delayed UTC events on both sides of Nov 22 switch.
6. Verify actual `event=schedule` GitHub Actions runs **and** new Supabase readback; passing CI alone is not production acceptance.

## Explicit guardrails
No deletion of old rows, no publication/policy/price/quota change, no newly paid API calls, no changed cron cadence. A standalone planning helper is not a production backfill.
