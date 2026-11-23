# Invest in Saudi V3 — owner-approved hybrid orchestration (2026-11-23)

## Intent and unchanged protections
- Stop treating all eight systems as one mandatory pipeline. Only W02 Radar → W01 GEO → W03 publishing-policy **checks** run in order. Each check uses `continue-on-error`; Radar failure must NOT prevent GEO from being checked. Any failed check still makes the linked pipeline red after all three results are collected.
- W05 LLM Feed and W06 maintenance run in separate Master jobs with **no depends-on** relationship to W02/W01/W03. This protects them from a failing Radar step. They still share the Master's five-minute trigger; they are independent check jobs, **not independent scheduled production executions**.
- `V3_MASTER_PAUSED` remains in effect for the Master, while Safety and Quality independently run irrespective of that variable.
- No recurring AI/search provider probes, content publication, bot PR or automatic code merge are added by this five-minute **test** workflow. Real W01/W02/W03/W05/W06 production workflows remain available for manual owner-controlled dispatch; enabling independent live runs requires a separate decision.
- Existing Supabase rate limits, tokens, RLS, pricing and publication policy are not changed.

## Scheduler ownership
| Owner | Purpose | UTC cron | Saudi local times |
| --- | --- | --- | --- |
| Master | W02/W01/W03 checks in series; W05/W06 parallel test jobs | `3,8,13,18,23,28,33,38,43,48,53,58 * * * *` | Every 5 minutes, offset 3 |
| GSC | **Automatic real sync** with immutable scheduled-event gate and artifact dedup | original 12 explicit UTC cron expressions, including `45 0 * * *` | Due windows: 03:45, 09:00, 13:00, 17:00, 21:00, 01:00 |
| Safety Monitor | Independent Master watchdog and weekly summaries, including on-completion alerts | `17 */6 * * *`, `0 6 * * 0` | Every 6h at :17 KSA, plus Sundays 09:00 |
| Quality Watch | Real public quality + offline Evals and issue reconciliation, regardless of Master state | `23 2 * * *` | Daily 05:23 |

The GSC workflow retains its original per-cron gate. Only six of its 12 cron fire lanes are due after the Nov 22 Saudi cutover; a skipped lane is never counted as a fresh GSC collection. The Master no longer sends the GSC request: GSC is truly separately scheduled.

## Independent Master failure detection
The 6-hour Safety schedule runs even if the Master stops triggering entirely. `scripts/v3-master-health.cjs` considers **only** actual `event=schedule` runs on main; no push/manual event is treated as an automatic success. It raises/updates one deduplicated GitHub issue for a Master schedule that has not fired successfully for 60 minutes, or a failed scheduled Master, and closes the issue only on verified healthy scheduled evidence or deliberate master pause. A `workflow_run` event for the Master also permits prompt failure detection. It neither starts production systems nor consumes provider quotas.

The existing W01/W02/W03/W05/W06 standalone crons are absent, so the Stage-2 watchdog now reports them as **delegated/test-only**, rather than fabricating alerts that the retired schedules are late. W04 is monitored through its own real scheduled run plus storage readback. Weekly reports must not claim Master testing is equivalent to successful production research or publication.

## Acceptance and rollback
1. CI must verify the four independently owned schedules, no additional per-system cron, job independence, Radar-failure isolation, GSC immutable slot/dedup, real Safety event registration, quality isolation and `V3_MASTER_PAUSED` behavior.
2. After merge, verify `event=schedule` for Master **and** GSC; verify GSC's actual `Collect GSC metrics` step succeeded and storage has an observed outcome or justified no-data interval.
3. Verify Safety's own `event=schedule` detects missing or failed Master without requiring a Master run. Verify independent Quality `event=schedule` visits production.
4. Do not close Stage 2 merely from green CI or a successful push smoke. The production 80% atomic quota gate remains independently open.
5. Roll back by reverting the PR through GitHub review, not by editing cron in place. Do not delete other owners' workflows or credentials.
