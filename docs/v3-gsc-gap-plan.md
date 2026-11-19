# V3 GSC missing-day backfill: staged technical contract

Issue #145. The deterministic planner from PR #151 now has an isolated, adapter-based executor and regression suite. The existing GSC endpoint and cron are unchanged. No backfill queries or writes run until a persistence adapter is approved and wired.

## Observed production state on 2026-11-19
- Current `src/app/api/cron-gsc/route.ts` collects **only UTC today minus three days**.
- Existing `gsc_daily_metrics` holds a separate `dimension` column; do not create a duplicate `gsc_daily` table without confirming grain and ownership.
- Supabase had five `total` rows from 2026-11-12 through 2026-11-16, with zero impressions in total. The latest capture was 2026-11-19 07:44:22 KSA. No page, query, country or device rows were present.
- Existing shared `scheduled-cadence-gate.cjs` relies on actual GitHub Actions start hour; delayed scheduled jobs can be skipped. Correct this independently while preserving the exact existing KSA two-hour / four-hour cadence.

## Planner contract
- Only complete UTC days through **today minus three days** can be scheduled.
- Missing day => `missing` target, **not proof of a prior failed attempt**.
- `failed` => retry no sooner than one day after last check.
- `success_no_data` => ordinary successful empty response; check again after three days initially, then after seven days. This is never counted as failure.
- `success_with_data` => never refetch without a separately requested refresh.
- Bound backlog candidates: maximum ten per run, 45-day default lookback, no synthetic metrics.

## Isolated execution contract

- Collect one planned date at a time using the existing per-grain paginator and 25,000-row ceiling. Finish every grain before passing a measurement to the storage adapter. Duplicate dimension keys or an incomplete response fail the day without writing partial measurements.
- A successful response with no rows is `success_no_data`. A returned site-total row with zero impressions is an observed row. The result separately counts `total`, `query`, `page`, `country` and `device` rows, so a total does not imply page or query observations.
- A quota signal commits a failed outcome for the attempted day and stops further requests in the run. A commit or readback error aborts the remaining dates. The executor does not attempt a second write when the first write may have committed.
- An adapter must serialize commits by property and day, check the previous attempt count, commit the outcome and measurements in a single transaction and preserve previous measurements on collection failure. A separate readback must check the resulting outcome and the newly written measurement keys and values. Current fixture tests verify the executor contract. A Supabase transaction and production readback still need verification after the schema and adapter are approved.

## Required remaining integration (not yet implemented)
1. Select a verified persistence location for per-date `status`, `checked_at`, `rows_fetched` and `attempts`. Database schema/policy change requires explicit owner approval; do not silently add a table or co-opt a wrong table.
2. Read existing metric rows and recorded sync attempts, then call `planGscCatchup`. Missing date in `gsc_daily_metrics` alone cannot distinguish no traffic from failed sync.
3. Implement the transactional storage adapter and verify it against the approved schema before wiring `executeGscCatchup` into the endpoint. Map upstream quota errors to `GscQuotaReached`.
4. Validate the configured request budget and receipt readback against actual stored rows with the approved adapter before enabling catch-up.
5. Fix delayed schedule detection in the existing gate without changing approved operational cadence; test delayed UTC events on both sides of Nov 22 switch.
6. Verify actual `event=schedule` GitHub Actions runs **and** new Supabase readback; passing CI alone is not production acceptance.

## Explicit guardrails
No deletion of old rows, no publication/policy/price/quota change, no newly paid API calls, no changed cron cadence. A standalone planning helper is not a production backfill.

Run `npm run test:visibility` for the planner, executor and collector fixtures. Revert the executor commit to remove this staged change. There is no runtime deployment or data rollback for the isolated executor.
