# Phase 2.4 — public competitor-link and V3 Evals quality alerts

Scope: **quality monitoring only**, not content publication, automatic content rejection, paid-model research, or a new Supabase migration. This work is separate from the six-workflow monitor merged in PR #189 and the Master Pause merged in PR #194.

## Mechanism
- Daily GitHub Actions workflow `v3-stage2-quality-watch.yml` at UTC 02:23 (05:23 KSA) runs local, pinned dependency regression Evals and a bounded read-only audit of the production site's canonical sitemap and published HTML.
- Current 24 fixed pages plus permitted published `/insights` pages from the existing `scripts/public-sitemap-audit.cjs` contract. Limit 150 pages, fetch only exact own-origin URLs, manual redirect handling, 4 concurrent GET requests and bounded response size; no editor/admin/secret endpoints fetched except the existing protected GEO data endpoint.
- Competitor domains come from `GET /api/geo/data` with **existing** `GEO_API_KEY` (the only secret passed to this workflow), plus the existing four conservative fallback domains in `src/lib/source-policy.ts`. Disqualified competitor entries do not enlarge the live list. Registry failures return `partial` and cannot resolve a prior incident. Research metadata in Next.js hydration is not automatically treated as public copy; inspect visible public HTML/links and literal `cited_sources` arrays.
- A suspicious competitor URL in published copy or `cited_sources`, or a genuine failure in the existing V3 keyword/source Eval corpus, raises/updates a single fixed-title **GitHub issue with `failure` label**, never a flood of duplicates. A complete clean scan plus successful Evals closes that same issue; missing pages, failed registry or unavailable Evals never close it.
- `workflow_dispatch` and pull-request runs perform **offline fixtures and Evals only**; issue writes and production HTTP scanning are confined to natural `schedule`.
- Reports must not infer Google rank, crawl indexing, real AI citations, or leads. No external search model is called.

## Evidence and limits
- Offline mocks exercise 24 pages, current competitor registry, fake visible competitor link, internal evidence false positives, literal public `cited_sources`, duplicate issue updates, red Evals, incomplete HTTP/registry, and successful resolution.
- Actual scheduled quality scan/incident creation and any eventual recovery **still require observation**. A passing PR CI only proves the logic/fixtures.
- If the GitHub repository did not configure `GEO_API_KEY` for this new workflow, the registry remains partial; never label the clean result as fully verified.
- This PR intentionally avoids `docs/plans/PROGRESS.md`, the main admin dashboard, and the existing Stage 2 / Stage 3 files being edited by the concurrent project streams. Integrate summary after source branches merge.
- The master pause flag suppresses production pipelines; this public read-only quality monitor still safely gathers evidence while pipelines are paused.

## Stage 2 still open
- Actual first six-hour watchdog + one weekly GitHub issue in natural schedule, failure alert delivery simulation, 2.5 secure owner-facing pause button (or an explicitly approved safe alternative), and 2.6 trusted daily per-provider quota enforcement at 80% remain unverified or not implemented.
- The preexisting human review requirements for legal/regulatory/financial/residency content remain binding. Phase 3's audit-only gates are not live publisher permission.
