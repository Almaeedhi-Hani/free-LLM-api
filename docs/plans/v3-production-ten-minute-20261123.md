# Invest in Saudi V3 — 10-minute production Master, 23 November 2026

## Owner decision
The five-minute V3 test-only Master is replaced by a **real production** GitHub Actions orchestration every ten minutes, with `on.schedule: '7-57/10 * * * *'` on `main` (Saudi minutes 07,17,27,37,47,57). Unlike the old simulated integration job, the Master invokes the original authorized production workflows using same-repository `workflow_call`:
- **W02 Market Radar** → **W01 GEO Intelligence** → **W03 Auto Publication**, in order. `always() && !cancelled()` lets W01 run even when Radar failed; W03 can run regardless of W01 outcome, while the overall Master reports failure. This does not bypass the child workflows' own pause/approval/DB limits.
- **W05 multilingual index** and **W06 bounded maintenance** run in parallel, independent of Radar and GEO, with existing CI-gated PR permissions and their own pause variables.
- **GSC** retains its genuinely automatic independent 12-trigger/effective 4-hour schedule. **Safety Monitor** retains its independent six-hour, Sunday weekly and workflow_run triggers; **Quality Watch** stays daily. This Master is not their scheduler.

## Live-production safety
A **ten-minute clock does not mean twelve paid AI/search requests per hour**. Existing production cadence in `scripts/scheduled-event-slot.cjs` now understands the single Master `7-57/10 * * * *` event, validates GitHub's immutable scheduled-run metadata, rejects reruns (`attempt != 1`), and runs real operations only when a tick is **within 10 minutes after the historically approved 4-hour nominal slot**. Non-due ticks are successful skips at the *real production workflow*'s cadence step, not mocked test successes. No attempt is made to recover ambiguous, stale, missed ticks by blindly retrying provider calls. The existing full GEO process, original bounded Radar endpoint, guarded publisher RPC, index PR CI gate, and maintenance change scope remain unchanged.

Effective scheduled *due* windows (Saudi UTC+3, after Nov 22 cutover):
| Job | Real due-tick times (daily, KSA) |
| --- | --- |
| W02 Radar | 01:57, 05:57, 09:57, 13:57, 17:57, 21:57 |
| W01 GEO | 00:07, 04:07, 08:07, 12:07, 16:07, 20:07 |
| W03 Publisher | 00:57, 04:57, 08:57, 12:57, 16:57, 20:57 |
| W05 LLM Index | 01:17, 05:17, 09:17, 13:17, 17:17, 21:17 |
| W06 maintenance | 01:37, 05:37, 09:37, 13:37, 17:37, 21:37 |

This table is the **nominal due window** only: it does not prove GitHub delivered `event=schedule`, that a quota-bearing provider accepted a call, or that Supabase persisted new data. Every ten-minute tick re-evaluates eligibility but an eligible date/slot may be *skipped* if GitHub delivery is delayed beyond the 10-minute acceptance window; duplicates cannot be promised exactly once without an external atomic scheduler/lock.

## Stop, safety checks, rollback
- `V3_MASTER_PAUSED` pauses the Master and child workflows; `MARKET_RADAR_PAUSED`, `LLM_INDEX_PAUSED`, `AUTODEV_PAUSED` remain independent. Owner's existing publishing review/DB limits, model free-tier fallback behavior and secrets are unchanged. The requested 80% atomic provider-quota cutoff has **NOT** yet been demonstrated production-wide; existing bounded call budgets remain.
- `push` on the Master YAML invokes *only* lightweight preflight contract verification, **never production API requests**. Manual `workflow_dispatch` can execute real workflow operations under existing controls; it must not be confused with an automatic `event=schedule` run.
- `on.workflow_call` in each child workflow allows exact real business logic reuse; children have **no independent cron**, so double scheduling is avoided. Child workflow runs share the caller's GitHub run ID; operations remain serialized by their own concurrency groups plus the Master group.
- The temporary five-minute Sentinel diagnostic was removed. Logs collected under PR #273 already confirmed all prior workflows registered `active` on GitHub.
- **Acceptance requires GitHub event=schedule on the new Master after merge, successful preflight and eligible child stage execution, plus saved outcomes read from Supabase when due**. Success from pull_request or push is insufficient. GitHub schedule delivery has historically been delayed several hours and remains unverified; code deployment does not guarantee a cron event.
- Existing external fallback in `scripts/v3-github-dispatch-fallback.cjs` remains inert: its credential, costs and independent scheduler have not been authorized. It still points to this Master filename, but is not active; if activated in a different change, it must be updated to understand ten-minute production safety and the desired cadence.
- If rollback is needed, revert this PR to restore the previous five-minute fixture-only Master while leaving GSC/Safety/Quality untouched, then manually verify no live child is still running before further actions.
