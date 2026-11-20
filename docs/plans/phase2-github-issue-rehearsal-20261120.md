# Phase 2 — real GitHub Actions Issue delivery rehearsal

**Checked at:** 2026-11-20 15:56 UTC. **Synthetic test only:** no production failure, no false W01–W06 alert, no AI/search, no scheduled workflow impersonation.

## Real observation

- A temporary branch-scoped workflow, [run #44768192717](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44768192717), used the production monitor's own `createClient().upsertIssue()` method under actual GitHub Actions `issues:write` permissions.
- A first synthetic `[V3 rehearsal only]` Issue was created as [#204](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/204), but an immediate repeat under the exact same title created [#205](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/205). The rehearsal **correctly failed** `REHEARSAL FAILED Dedup failed`. Both were clearly labeled synthetic and both were **closed** in the same ChatGPT conversation after inspection.
- This proves production Issue *write delivery* works but exposed a genuine same-job dedup race. The most likely reason is GitHub's list/read-after-write delay; exact GitHub caching internals are **inferred, not verified**.

## Narrow correction

- Maintain an in-memory title-to-open-Issue-ID map inside one monitor client. Save newly created Issues immediately and update the map when the body changes; remove it only after successful close.
- A repeated `upsertIssue` within one Actions process now updates the original Issue ID even if the remote `GET /issues` still reports no open Issues. A deterministic offline regression mock returns an empty GET list forever and confirms exactly one create, one update and one close.
- The existing Actions workflow `concurrency.group=v3-stage2-safety-issues` still serializes separate monitor jobs, and remote Issue lookup still happens for an independently started process. This does **not prove globally atomic dedup** across unrelated token issuers or a GitHub API outage.
- After code CI, repeat one real **synthetic** GitHub Actions test against the changed source on an isolated branch, verify one Issue is created, updated and closed, then remove the temporary workflow file. Never merge the rehearsal workflow to main.

## Release boundaries

- No code or schema changes to the live W01–W06 pipelines, publishing policy, schedules, Master Pause, quota cap, admin UI, public content, or production database.
- CI/Evals, browser tests, production read-only release verification required. **Do not claim Stage 2 overall exit**: first genuine six-hour watchdog schedule and Sunday weekly Issue, quality schedule, 80% provider ledger and owner-safe pause UI remain separate gates.
