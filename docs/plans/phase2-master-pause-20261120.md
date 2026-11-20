# V3 Phase 2 — owner-controlled master pause (repository variable, no new website permissions)

Date: 2026-11-20. **Partial Phase-2 change.** The user authorized beginning Phase 2 and Phase 3. This PR continues Phase 2's prior merged monitor [#189](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/189).

## Controlled behavior

- Each of the six W01–W06 production workflow jobs now checks the same existing-class repository-variable gate `vars.V3_MASTER_PAUSED != 'true'`. When the flag is missing/false, behavior is unchanged; when it is exactly `true`, the job is skipped *before* provider requests, database mutations, or public publication.
- The pre-existing provider-specific flags `MARKET_RADAR_PAUSED`, `AUTODEV_PAUSED`, and `LLM_INDEX_PAUSED` are preserved as **additional restrictions**, never replaced or reset. W01/W03/W04 use the common gate.
- None of the existing `on.schedule` UTC cron expressions, cadence logic, secrets, provider limits, publication policy, GitHub role scopes or CI gates is changed.
- The phase2 watchdog reads the exact repository pause variables and correctly returns `paused` rather than incorrectly issuing a stale/failure alert while the owner has intentionally paused production. If GitHub variable reads fail unexpectedly, it says `unknown` and suppresses unverified incidents; a missing variable (404) is treated as disabled.
- Unit tests assert all six jobs have a guard, the three prior flags still exist, alert suppression on master/legacy pauses and safe unknown behavior when variable reads are unavailable.

## How the owner can pause safely today

In the GitHub repository, use **Settings → Secrets and variables → Actions → Variables → New repository variable**. Set `V3_MASTER_PAUSED` exactly to `true` to pause the six W01–W06 production jobs; set it to `false` (or remove the variable) to resume. There is **no automated owner toggle or database setting installation in this PR**. The assistant did not create or change the variable.

Do **not** add a GitHub personal access token with repository variable write permissions to the website/admin. Dashboard button remains a separate design decision; under the current parallel plan, another conversation owns `src/app/admin/dashboard/page.tsx`. The repository-level variable is the safe administrative fallback until an approved server-side permission architecture is designed.

## Non-claims / acceptance gates

- This cannot prove an actual pause/resume cycle until the owner uses the flag and scheduled runs are observed; **do not set the flag automatically or stop production merely to satisfy a test**.
- The six-hour watchdog, failure alerts, weekly report and persistence GETs from PR #189 remain a separate Stage-2 slice. Alert simulation and real weekly report issue delivery are still to be witnessed.
- Stage 2 is **not complete**: quality alerts, per-provider 80% free allowance guard with actual counters, dashboard button, real weekly report/incident delivery and full production acceptance remain outstanding.
- Phase 3's code stays offline/draft until Stage-2 acceptance and root `AGENTS.md` qualified human review policy is resolved; this PR does not alter review or content publishing.

Owner security proposal for `rls_auto_enable()` and `geo_set_updated_at()` remains **unapplied**. No production SQL changes are authorized here.
