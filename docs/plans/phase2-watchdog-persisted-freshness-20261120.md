# V3 Phase 2 — source-backed persisted-output freshness watchdog

Date: 2026-11-20. This is a narrow safety-monitoring correction, not Stage 2 acceptance.

## Confirmed gap

The existing six-workflow watchdog fetched the latest database timestamp for W01–W04, but only classified **GitHub Actions schedule staleness** for issue creation. A workflow could therefore be described as healthy despite no recent persisted output. Stage-2 acceptance requires readback as a separate condition. W05 machine-index and W06 maintenance can legitimately perform `no_change` without new records, so they have no required persistence table and remain exempt.

## Implemented behavior

- Uses the existing read-only PostgREST responses: `content_store.updated_at` (W01; shared content store, **not strict W01 run provenance**), `analysis_runs.finished_at` for successful radar (W02), `geo_publication_rpc_result` audit rows attributed specifically to W03 (W03), and `gsc_sync_day_outcomes.checked_at` (W04).
- Flags a distinct `[V3 watchdog] W0X … persisted output stale` issue only when the associated **real scheduled** GitHub workflow is healthy and the observed persisted record is older than twice its nominal 2-hour (until the KSA 22 November cadence change) or 4-hour interval (after cutover).
- A newly verified fresh timestamp plus healthy scheduled run resolves the stored-output incident. An owner-requested pause resolves it without pretending there was fresh data.
- Missing or unreadable storage, unexpected or future timestamps, and `no_change` workflows remain **unknown/not_applicable**, not fabricated successes and not new alarm issues. Existing schedule-stale incidents remain independent; pending/stale scheduled runs do not create a second storage incident.
- Weekly report now explicitly displays a `Storage freshness` column (fresh, stale, unknown, not_applicable), so a green GitHub run alone is not represented as complete evidence.
- Tests cover the exact threshold both sides of the 2h/4h transition, actual Issue create/update/resolve with mocked GitHub HTTP, no false incident on missing credentials or W05 no_change, and explicit weekly-report freshness.

## Limitations and mandatory next proof

- W01's shared `content_store` timestamp can be updated by a different workflow. This is a **coarse freshness signal**, not a cryptographically attributed W01 save. Continue using real W01 schedule artifacts and source/audit checks for full acceptance. Do not claim source-specific W01 proof from this timestamp alone.
- No live watchdog write, provider diagnostic call, publication, database schema, settings update, or artificial schedule was initiated by this change.
- The next **real `event=schedule` six-hour watchdog** must be inspected for the expected observations and, if a genuine stale stored result exists, the corresponding GitHub Issue. A green PR CI or workflow_dispatch alone does not prove real schedule delivery.
- The true Sunday weekly report, first quality-watch schedule, owner-approved safe pause control and actual free-provider account limits/atomic 80% quota guard remain open. Stage 3 integration and Phase 4/5 admin drafts remain separate.
- The existing user-owned publication `daily_limit=3`, high-risk review policy, model/search quotas, legal-review rules, cron schedules and production schema are unchanged.

**Exit criteria for this PR:** exact file scope review, green PR CI (including browser and V3 Evals), then Render LIVE parity and postmerge production/admin read-only acceptance. These do not themselves close the full Stage 2.
