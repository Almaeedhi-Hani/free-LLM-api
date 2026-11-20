# V3 Phase 2 — truthful W03 source and measured GSC weekly evidence

Date: 2026-11-20. **Scoped Phase-2 improvement, not an exit certificate.**

## Defect and correction

The initial watchdog's W03 PostgREST readback checked only the most recent broad `geo_publication_*` audit event. A successful W01 publication attempt could therefore make W03 look recently persisted even if W03 itself had not recorded a result.

The monitor now reads **only** `geo_publication_rpc_result` rows whose existing JSON metadata includes `source_workflow=W03`. It still reports `unknown` when the authorized Supabase read-only query fails or returns no rows. A W03 `quota_reached` RPC result is valid evidence of its bounded run; it is not a newly published article. W01's independent workflow and stored output remain separately assessed. This changes monitoring classification only, never the publisher, database schema or quota.

The weekly reporter now requests at most seven **already persisted** GSC `gsc_daily_metrics` rows at the `dimension=total` grain. It reports the most recent *measured date* and its actual impressions/clicks, plus number of distinct measured days inspected. It **never** sums page/country/device/search-query grains together, never infers Google indexing, a #1 SERP position or AI citations. Missing credentials, invalid or empty measurements, invalid duplicate dates or network errors are shown as `unknown`, never zero.

The existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reused only inside the existing GitHub Actions monitor when configured. **No service key is added to the website or printed.** These are GET-only PostgREST calls. The workflow's Sunday schedule and all W01–W06 production schedules remain unchanged.

## Evidence at 2026-11-20 14:53:35 UTC (Supabase SELECT, read-only)

- Existing `audit_logs` `geo_publication_rpc_result` grouped by original source: W01 had 2 `quota_reached` results (latest 14:02:44Z); W03 had 7 `quota_reached` results (latest 14:25:38Z) plus 2 actual `published` results (latest 2026-11-19 23:54:58Z). W03 and W01 need **separate filters**.
- Latest measured `gsc_daily_metrics` `dimension=total` date 2026-11-17: **3 impressions, 0 clicks**. Nov 12–16 `total` rows had 0 impressions/clicks. These are measured observations, not evidence of indexing, conversion, or rank.
- Offline tests use mocked URLs/responses, verify the W03 JSON-source filter, GSC `total` query only, valid/missing/duplicate/malformed rows, and the actual weekly issue-body text without calling any external provider.

## Still open before Phase 2 exit

- A **real six-hour schedule** must demonstrate the watchdog can read GitHub data and authorized Supabase rows; simulated test results alone cannot close the gate.
- The first real weekly report issue on the actual Sunday schedule (or a separately labeled non-schedule manual test) must be verified, and GitHub notification receipt must be checked. No success is claimed from this PR alone.
- Quality watch requires its own real scheduled cycle and incident/no-change evidence.
- Master Pause is currently an owner-controlled GitHub variable, **not** a one-click admin toggle. No GitHub variable-write scopes should be given to the website without separate approval.
- Actual account-specific free-provider daily allowance and durable usage reservations remain **unknown**. Draft #199 is owner-gated; never guess daily caps or claim 80% enforcement based on per-run limits.
- The required `pre-phase2-YYYYMMDD` Git tag was not returned by a current-turn GitHub tag-ref lookup; reconcile this phase-safety prerequisite explicitly before accepting the overall phase.
- Phase 3 production and Phase 4/5 cross-workstream modifications are out of scope; the separately pending Supabase security migration remains unapplied.

**Commit/PR rules:** CI, V3 Evals, browser acceptance, and production read-only acceptance must pass; do not merge the phase-wide gate unless all original prerequisites are met. Do not change publishing `daily_limit=3`, automatic high-risk mode, existing provider keys, workflow crons, public content, or the production database.
