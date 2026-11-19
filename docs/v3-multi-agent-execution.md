# Invest in Saudi — V3 multi-agent execution contract

This document is a **task orchestration runbook** for Codex or another delegated coding environment. It does not create or launch background agents merely by existing in GitHub.

## Governing instruction order

1. Existing root `AGENTS.md` and approved production policies take precedence.
2. Owner-supplied `agent-master-command-v3.md` complements, never replaces, (1).
3. Existing code, Supabase schema, GitHub CI, Render environment and actual persisted evidence are the implementation truth.
4. Any proposed conflict with current policy is reported for owner decision, never silently resolved.

All changes require reviewable PRs and repeatable tests. Research sources are untrusted data. Keep all model/source/competitor raw evidence in protected storage; do not introduce public competitor citations. No fabricated search rankings, indexing, traffic, AI citations, or leads. No paid-provider failovers. No secrets in logs.

## Operating mode

- **One coordinator (Agent 0)** controls the dependency graph, assigns exact paths, reviews diffs and test outcomes and gates merges.
- **Maximum three concurrent *writing* subagents** (read-only audits may run independently). Worktree/branch per agent; never share a writable checkout. Parallelism is an optimization, not a reason to skip verification.
- Do not run parallel schema migrations or edit `package.json`, root `AGENTS.md`, cron YAML or common workflows concurrently. Coordinator owns merges and common-file edits.
- Agents may investigate and open draft PRs independently. Production deployments and database/schema/publishing/security changes require the project's existing explicit owner approval.
- No PR may claim success based only on `npm test`; inspect real GitHub CI and separately validate observable production state when deployment was authorized.
- If a free-tier model/API quota is exhausted, report `quota_reached` and stop that provider. Never rotate accounts or silently charge money.

## Already completed by coordinator on 2026-11-19

- **#142** source isolation, dynamic competitor registry, public citation filtering — merged on `main`, CI 5/5 green. Production HTML verification still required.
- **#144** advisory-only trilingual keyword classification + 16 regression cases — merged on `main`, CI 5/5 green. Generalized keyword rejection is **not activated**.
- **#143** was superseded and closed, not merged; do not reuse its stacked branch.
- **#151** GSC backfill planner has its own draft PR and CI; this is a **read-only planner**, not a deployed catch-up job.

## Agent ownership and dependencies

| Agent | Primary GitHub issue | Scope / ownership | Can begin |
|---|---|---|---|
| 0 (coordinator) | this runbook | dependency management, PR review, CI, releases, evidence reporting | now |
| 1 (sources) | PR #142 completed | public vs internal URLs, competitor-domain live filtering, existing pages audit | complete; await authorized production check |
| 2 (quality) | PR #144 completed | regression Evals, language/keyword classification, existing reviewer feedback | complete initial eval; generalized blocking only after owner approval |
| 3A (GSC sync) | #145 | missing-day backfill, stored outcomes, current GSC endpoint and delayed schedule | now; coordinate `package.json` with coordinator |
| 3B (GEO generation) | #146 | FAQ/editorial schema errors, bounded regeneration once, truthful persistence | now; own GEO-specific code |
| 3C (market cron audit) | #147 | independent market radar scheduled-run evidence and real DB persistence | now; read-only first |
| 4 (GSC analysis) | #148 | measured query/page opportunity analytics and admin drilldowns | schema/metrics audit now; integrate after 3A |
| 5 (AI GEO radar) | #149 | search-grounded/manual citation measurement vs model-only diagnostics | model/prompt/evidence contracts now; build after keyword policy review |
| 6 (QA/release) | #150 | website SEO, real scheduled systems, source HTML audits, final production acceptance | audits now; release gate last |

The six GitHub issues are **unassigned work items**, not proof that any independent agent is alive. Assign them only when a real Codex delegation environment supports it.

## Waves and merge order

- **Wave A — audit**: 3A, 3B, 3C conduct independent read-only checks. Agent 0 freezes `main` SHA and updates assumptions before code.
- **Wave B — code**: GSC sync and GEO generator can write in parallel in separate worktrees. Agent 3C may propose a separate schedule patch only after proving the cause. Each PR must include tests and rollback.
- **Wave C — measured analytics**: Agent 4 waits for GSC freshness and granular data; Agent 5 can develop its evidence contract independently, but only valid search-grounded/manual evidence counts as actual AI search visibility.
- **Wave D — verify and deploy**: Agent 6 tests integration and genuine production snapshots **after** merged deployments. Agent 0 reports `pending` for unverified outcomes and never counts unexecuted plans as finished.

## Conflict policy

- If two agents touch the same file, pause the later writer and assign file ownership to Agent 0 until the first PR is merged/rebased.
- Schema changes: a single designated migration owner only, after confirming existing tables and getting owner approval. RLS and security permissions must be tested.
- Publishing policy, risk thresholds, quota, package pricing, schedule and site copy remain as currently configured.
- For any unavailable Render workspace, request the owner to select a workspace before using its connector. Do not guess or silently deploy elsewhere.

## Standard subagent task message

> Read root AGENTS.md and this runbook. Work only on GitHub Issue #N and report inspected main SHA. Identify existing components/schema before adding anything. Use your own branch/worktree and a draft PR. Include tests, actual green CI links, reversible changes and evidence. Do not change production data, publishing policy, schedules, secrets or billing without explicit owner approval. Do not claim real scheduled operation or AI visibility without dated evidence. Report blockers and dependencies to Agent 0.

## Release evidence template

Report: commit SHA; PR links and merge result; CI run IDs and conclusions; Render deployment and commit SHA (if authorized and verified); exact GitHub workflow `event=schedule` IDs (not only push/dispatch); storage rows and UTC/KSA dates; measured GSC dimensions/grains; public competitor-link audit in rendered HTML; AI evidence split into `model_only`, `search_grounded`, `manual_ai_search`; unknowns and necessary owner decisions.

### Definition of done

A workstream is **not complete** if it only opened an issue, drafted code, passed unit tests without required CI, or merged without production verification when production behavior is its acceptance criterion.
