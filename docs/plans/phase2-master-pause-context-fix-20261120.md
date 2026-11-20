# Stage 2 Monitor Safety — consume repository pause flags from Actions context

**Purpose:** Eliminate an unnecessary GitHub REST permission dependency in `v3-phase2-safety-monitor.yml`.

- PR #194 set `V3_MASTER_PAUSED` and preserved three legacy pause flags. It added monitor logic calling `GET /repos/{owner}/{repo}/actions/variables/*` to decide whether to suppress stale/failure Issues. Some Actions tokens may lack permission to read repository variables through REST. An HTTP 403 correctly became `unknown`, but could suppress all alerts. **Whether a production token actually received 403 has not been observed**; this is a proactive reliability guard, not a proven production outage.
- The workflow itself always has read access to its `vars` context. Both scheduled monitor and workflow_run failure jobs now explicitly pass `V3_MASTER_PAUSED`, `MARKET_RADAR_PAUSED`, `LLM_INDEX_PAUSED`, and `AUTODEV_PAUSED` as environment values. Missing variables yield empty strings, not a production pause.
- The monitor prefers that exact workflow-context snapshot and does not issue REST variable calls in Actions. If the context object is incomplete, status is `unknown`; if any relevant flag is the literal `true`, status is `paused`. For non-Actions test clients the conservative REST fallback remains unchanged.
- Does not alter the original W01–W06 cron expressions, repo variables, production policy, publishing cap, Supabase privileges or workflow token permissions. No actual Master Pause toggle is performed.
- Offline mocks prove `active`, global pause, legacy pause, incomplete context, and **zero GitHub-variable REST calls** even when all REST permissions are denied. Deployment proof and a real scheduled monitoring run still must be separately observed.
