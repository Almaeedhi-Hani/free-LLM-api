# Owner-approved automation cadence (Saudi Arabia)

Implemented 2026-11-18. All times **Asia/Riyadh (UTC+03:00)**.

## Exact automatic transition

- **From rollout through Saturday 2026-11-21 at 23:59 Saudi**: real work is eligible every **two hours**.
- **From Sunday 2026-11-22 at 00:00 Saudi onward**: real work is eligible every **four hours**, indefinitely unless changed.
- GitHub cron cannot directly express an automatic one-off change of frequency. The schedules remain 2-hour UTC cron triggers but a **tested in-repo gate** skips alternating slots after the Sunday transition. Skipped jobs do not call providers, publish, write content, generate PRs, or deploy.
- Scheduled GitHub Actions can begin late. A run always reports its status; configuring the cron does not guarantee each external API or model responds.
- Explicit manual dispatches and one-time scoped workflow-file rollout pushes bypass the cadence gate. The normal workload is not 24/7.

## Systems and launch offsets

| System | Wed–Sat Saudi 2h eligible times | From Sun Saudi 4h eligible times | Maximum job duration |
|---|---|---|---|
| GEO Intelligence Analysis (the dashboard's secret weapon) | 00:00,02:00,...22:00 | 00:00,04:00,...20:00 | 45 min |
| GEO automatic publication eligibility | 00:50,02:50,...22:50 | 00:50,04:50,...20:50 | 8 min |
| GSC metrics sync | 01:00,03:00,...23:00 | 01:00,05:00,...21:00 | 8 min |
| Machine-readable LLM index review | 01:10,03:10,...23:10 | 01:10,05:10,...21:10 | 25 min |
| Bounded autonomous technical site maintenance | 01:35,03:35,...23:35 | 01:35,05:35,...21:35 | 25 min |
| Independent Market Intelligence Radar | 01:55,03:55,...23:55 | 01:55,05:55,...21:55 | 10 min |

GitHub schedules are UTC and implemented by six files in .github/workflows: geo-analysis.yml, geo-auto-publication-daily.yml, gsc-daily-sync.yml, llm-feed-optimization.yml, autonomous-site-maintenance.yml, and market-radar.yml. The shared gate is scripts/scheduled-cadence-gate.cjs.

## Independent data and safety rules

- GEO continues to use the existing bounded free-model OpenCode full pipeline; language failures stay partial. **Frequent runs do not guarantee three complete languages**; watch free-tier rate limits.
- GEO publication checks the owner-approved DB policy each time. As checked before this change: enabled=true, allow_high_risk=true, daily_limit=1 **per rolling 24h**, unchanged. The fact that the workflow checks more frequently does NOT increase the number of allowed publications. A successful research run may also invoke the existing publication endpoint; this shares the same DB quota and idempotency.
- GSC is checked more often at owner request. GSC data is often delayed; missing data must never become zero or an invented conversion.
- The technical autodev engine is still limited to **one safe reciprocal link** between already-live service routes per successful run. It does not become an arbitrary coding agent. On no safe change it makes no PR.
- The **existing** /api/llm-version is dynamic and reflects approved published content. A new quality-checked **/llms.txt** is the concise AI-agent site index. The scheduled LLM audit reads the public canonical feed, verifies locale coverage, existing published service links and professional-fee disclaimers, builds the deterministic link index and changes **public/llms.txt only if meaningful public links change**. No timestamp-only change, duplicate PR, invented legal assertion, or unapproved draft is permitted. Before any index PR, it runs offline contracts and a production build. A narrow PR must merge safely, then Render deploy independently. A blocked PR is not claimed as published.
- **This LLM index quality gate applies to /llms.txt changes only.** It does not block the site's independent dynamic publication pipeline or reapprove legal copy at source; those are governed by the existing publication policy.
- Standalone Market Intelligence Radar was explicitly enabled by the owner after this initial schedule. It uses the **same shared Saudi cadence gate**, is offset to :55 of odd hours, retains the existing authenticated /api/cron-market endpoint, existing provider selection/query budgets and the 10-minute job timeout. Its research may overlap functionally with GEO discovery, so provider rate limits and duplicate/partial observations still require review. The standalone radar can be paused with the GitHub Actions variable MARKET_RADAR_PAUSED=true. The scheduled workflow has no automatic retry for ambiguous server responses.
- Current flow has 4 supported pause levers: MARKET_RADAR_PAUSED disables the independent radar, and use vars.AUTODEV_PAUSED to stop the narrow code editor, vars.LLM_INDEX_PAUSED to stop the machine index updater, and GitHub Actions workflow disable for GEO/GSC; the publication policy can be disabled separately in admin. No RLS, secret, price, or high-risk publication policy edits were authorized.

## Rollout verification

Require new branch tests and build; merge only after CI checks succeed. Inspect actual Render deployed commit and read-only production acceptance. The first main-push bootstrap for modified GEO/Autodev and newly added LLM may run once immediately, in addition to scheduled times. Verify the first event=schedule runs separately. Full 3-language GEO and GSC provider availability must be measured in live logs; neither is inferred from green CI.
