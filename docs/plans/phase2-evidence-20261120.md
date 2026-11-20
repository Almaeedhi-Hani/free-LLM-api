# Phase 2 — watch, alert, report, pause, quota evidence (2026-11-20)

**Owner authorization:** start Stage 2, then Stage 3 in the same conversation; Stage 4/5 analysis may proceed on separate branches in a different conversation without merging across unmet dependencies.

## Baseline evidence

- Phase 1 is merged and accepted operationally via [#187](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/187), full six-system matrix in `phase1-evidence-20261119.md`.
- Protected production is Render + Supabase; use existing GitHub `GITHUB_TOKEN` and GEO API secret, **not new paid accounts or widened site tokens**.
- Existing owner publication policy remains `enabled=true`, `allow_high_risk=true`, `daily_limit=3`. Never change it as part of monitoring.
- Actual consumer analytics: GSC Nov 17 total 3 impressions, 0 clicks. AI citation / actual search visibility remains **unknown** unless verified.
- Authorized Phase 2 target: a six-hour monitor, workflow failure Issue alerts, weekly review, competitor/Evals alerts, protected master pause, and safe daily no-cost provider guard.

## Stage 2A — implementation, not yet an accepted runtime gate

[Draft PR #191](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/191) adds:

- `scripts/v3-ops-monitor.cjs`, `scripts/v3-ops-monitor.test.cjs`: a true-schedule-only watchdog, twice expected interval (2h before Nov 22 00:00 KSA; 4h from then; alerts after 4h/8h), protection from synthetic dispatch/pass-through `push`, stable Issue titles for de-duplication, and strict no-fabricated-data output.
- `src/app/api/geo/ops-health/route.ts`: GEO-API-key-authenticated GET-only Supabase aggregate readback for agent lastRun, radar analysis, publication attempts and GSC day outcomes; never sends document content/PII.
- `.github/workflows/v3-safety-watchdog.yml`: 6h clock, with manual dry-run that creates no Issue.
- `.github/workflows/v3-production-failure-alert.yml`: `workflow_run` failures for the six named trusted main-branch production workflows. Issue label `failure`, fixed name, never checkout untrusted triggering ref.
- `.github/workflows/v3-weekly-evidence-review.yml`: Sundays 09:00 KSA, one report Issue with label `weekly-report`. Unknown evidence marked `unknown`, not zero, and `model_only` is not search-grounded.
- Existing admin regression now invokes the isolated monitor mock test.

**Important:** At the time the PR was authored these are **not verified as live 6-hour/weekly executions**, nor proof that owner notifications arrived. The 2.3 report currently cannot derive accepted/rejected keyword tallies or atomic per-provider daily spend, and must explicitly report unknown until that source exists. A green PR test or a no-op manual dispatch cannot satisfy the live schedule and weekly report gate.

## Pending decisions and implementation blockers

1. **2.4:** verify public competitor URL filtering against published visible HTML, dynamic competitor registry and stored `cited_sources`. Add at least one controlled simulated alert to prove Issue creation; never falsely claim no competitor leak solely from source unit tests.
2. **2.5:** the plan calls for a single Master Pause button across W01–W06, unifying existing `MARKET_RADAR_PAUSED`, `AUTODEV_PAUSED`, `LLM_INDEX_PAUSED`. The existing GitHub variable approach can be read by Actions, but the admin UI must not silently acquire new GitHub Variables write permission. Secure owner-approved control storage/credential mechanism needs design and explicit evaluation.
3. **2.6:** global no-cost provider **daily** usage accounting is absent from the existing per-run limits. Do not treat per-run search/LLM counters or cloud provider quota estimates as an atomic daily total. A shared persisted store and precise authoritative limits are needed before any automatic `80%` stop can be claimed.
4. **Release:** CI/Browser/V3 Evals, exact Render deployment SHA and authenticated 401 vs 200 behavior of the protected snapshot route, and first genuine W01–W06 watchdog/report issue readback are required before Stage 2 exit.
5. **Phase 3:** starts as a distinct advisory-only draft PR; never merge until Stage 2 gate, and never remove legal/financial/residency human review without explicit owner decision.

No production SQL, paid provider call, publication API attempt, site content or credential disclosure was made in preparing this work.
