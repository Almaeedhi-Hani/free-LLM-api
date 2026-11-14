# GEO scheduling — preliminary approval, NOT production activation

Approved for staging and isolated tests on 2026-11-14; **not approved for main deployment, scheduled remote writes or automatic publication**.

## Proposed Saudi Arabia timetable (Asia/Riyadh, UTC+03:00 year round)

| Pipeline | Saudi time | UTC cron | Maximum |
| --- | --- | --- | --- |
| Lightweight market observation | 03:15, 05:15, ..., 01:15 | `15 */2 * * *` | 12/day, 3 search requests and 30 candidate observations per run |
| OpenCode analysis | 08:00 daily, skip if unchanged | `0 5 * * *` | 1 attempted model analysis per Saudi day |
| Approved publication window | 10:00 daily | `0 7 * * *` | At most 1 already-approved, tested low-risk item/day; zero if none |

**The time 08:00 for analysis is a proposal**, because only the analysis frequency was approved. GitHub Actions cron can be delayed. For daily rate limits use persistent DB-backed atomic slot claims; a local GitHub runner file is NOT adequate.

## Architecture and responsibilities
1. Collector: validate source policies and rate limits; use a bounded list of permitted sources; do not run OpenCode, bypass bot defenses or silently fabricate search results. Normalize URL+language+query; store a content fingerprint so only new/changed evidence counts. Reuse the existing GEO radar only after validating its request budgets and durable idempotency.
2. Durable DB: store normalized evidence and fingerprints via a migration reviewed separately. Use a unique key or atomic upsert and claim one scheduled window per Saudi calendar date with a transaction or unique constraint. Review 500 MB Supabase free-tier usage and retention; do not log credentials or personal data.
3. Analyst: call OpenCode only once per Saudi day if meaningful new evidence and provider budget is available. A 2xx API response or 0 exit code is not adequate evidence of completed pipeline stages or actual storage. Verify each stage and database-save row IDs.
4. Publication: window != permission. Content must be explicitly approved, fact-checked, tested, low risk and claim the single daily slot atomically. Regulatory, residency, banking, fee and legal claims require specialist human review and are **excluded from automatic publication** here. Fail closed.
5. Preserve the existing weekly `.github/workflows/geo-analysis.yml` until a separate production activation decision. At activation, review whether to replace or disable that old weekly analysis to avoid duplicate LLM runs.

## Issues verified in current code
- `scripts/opencode-geo-analysis.js` runs the full pipeline and uses a model on every run, so it must **not** become the two-hour collector.
- `src/app/api/geo/results/route.ts` accepts values inconsistent with the SQL opportunity type values. Save success must be checked against inserted DB records.
- Its persisted stage result has `saved_to_api: false` hardcoded, so stage status is not proof of persistence.
- Current discovery used only 2 fallback official results in the latest run. Fix source quality and throttling before increasing frequency.
- `.github/workflows/market-radar.yml` has its periodic schedule deliberately disabled pending resource and source review.
- `src/lib/geo-stage-handlers.ts` has a legacy FreeLLMAPI path; do not route new analysis through it without inspecting and replacing it.
- Render sleeping behavior, actual quota/account plan, and OpenCode free provider availability are not verified from the deployed environment.

## Tests and release gates
- First test the pure offline decision engine with `node --test scripts/geo-schedule-policy.test.cjs`. It uses fixtures and NO network, secrets, database, publishing, or provider calls.
- GitHub isolated workflow runs ONLY from `test/geo-schedule-safety-20261114`, with `contents: read` and no secrets.
- Then implement real collectors with stubbed network in CI, unique DB-backed idempotency, retention, real API write acknowledgements and atomic daily slots, before a staged authorized end-to-end trial.
- Test repeated collection, failed source, time-zone boundary, provider rate limit, duplicate concurrent runs, DB failure and publish gates.
- Record run length, request count, unique evidence, API errors, bytes stored and provider budget. Confirm account usage before rollout.
- No schedules, production publish, DB migrations, API secrets, or production endpoint changes without separate approval.

## Rollback
Revert production workflow changes in `main` (none done here). Keep existing GEO pipeline and published content untouched during staging.
