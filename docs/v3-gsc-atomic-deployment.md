# V3 GSC: atomic day state and opt-in backfill deployment

Issue #145. The earlier PRs #151 and #153 produced the isolated planner/collector;
#157 corrected the existing schedule to resist runner delays. This change connects
the **existing executor**, not a replacement pipeline, to an atomic Supabase adapter.

## Approval / deployment boundary

**Do not enable this feature merely by merging this PR.** The new migration
`20261119_v3_gsc_atomic_day_outcomes.sql` has NOT been applied as part of
this PR. A separate owner approval to alter the production schema is required.

1. Review and approve the additive migration. Inspect actual Supabase schema and
   current security grants again; run SQL security/advisor checks.
2. Apply the approved migration through the managed migration process; test
   `gsc_sync_commit_day` and `gsc_sync_verify_day` from a controlled
   service-role fixture with rollback, not an uncontrolled production backfill.
3. Confirm existing `GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`,
   `GSC_REFRESH_TOKEN`, `GSC_PROPERTY_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are already set
   (never print or change key values).
4. Set server-side `GSC_BACKFILL_ENABLED=true` only after the migration is
   verified and the owner authorizes activation. No new public route or cron
   frequency is required; the existing signed GET endpoint serves both modes.
5. Verify a real scheduled `event=schedule` GSC run, compare **daily
   outcomes** with real page/query/total rows, and confirm stored timestamps.
6. If any problem appears, set `GSC_BACKFILL_ENABLED=false` to revert to the
   original D-3 daily collection. Do not delete any historical metric rows.

## Behavior

- Default flag absent/false: original GSC daily D-3 path unchanged.
- Enabled: fetch actual dated outcomes, plan at most **2 dates per invocation**,
  45-day lookback and complete days through UTC D-3, respect existing Google
  OAuth and Search Analytics pagination/25,000-row dimension ceiling.
- An empty successful Google result is stored as `success_no_data`. A 0/0
  total **observed row** remains measured and is `success_with_data`, not
  proof of organic growth.
- For each day, the service-role-only RPC inserts measured rows and outcome
  in **one DB transaction**, serializes competing attempts, prevents stale
  attempt counts, and reads back exact grain keys and values using a separate
  RPC. A failed or partial Google collection cannot insert partial rows.
- HTTP 429 halts subsequent dates; unknown Google failures are recorded as
  failed outcomes and the endpoint returns a non-2xx status.
- No retried ambiguous DB writes, no fake clicks, no zero-filled page rows, no
  change to publication policy or GSC cron schedule.

## Caveats

- SQL is additive and service-role-only; public RLS and table grants are explicit.
- The migration is included for review and is not evidence of any production
  schema change or successful data collection.
- Passing CI proves fixtures and TypeScript only, not actual Google Search
  Console traffic, site indexing, or live stored page/query measurements.
- Real Search Console can legitimately show no page rows for a new site.

## Rollback

Disable the flag first. Revert this PR if needed; leave the new audit table
and any confirmed metric rows intact for historical provenance unless the
owner separately approves a data/schema removal.
