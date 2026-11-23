# Optional external five-minute Master dispatch fallback (prepared, NOT activated)

## Why
The GitHub-hosted Master cron is valid and active, and push acceptance passed, but GitHub has not delivered a natural event=schedule to the Master after repeated scheduled slots. Older scheduled runs visibly arrived >4 hours after their nominal clocks. GitHub documents schedule delivery as best-effort. This file is a deployable fallback design, not a claim of proven GitHub root cause.

## Implementation
`scripts/v3-github-dispatch-fallback.cjs` runs in Node 20 without npm dependencies. Once provisioned as a Render Cron Job every five minutes (UTC `4,9,14,19,24,29,34,39,44,49,54,59 * * * *`), it authenticates with a *separate* fine-grained GitHub PAT that has **Actions: write** on **only** `Almaeedhi-Hani/free-LLM-api`. It performs a read-only GitHub API preflight for the recent Master runs. If a Master run was created within the last 4 minutes or remains active within 45 minutes, it **skips**. Otherwise it sends exactly one POST to GitHub workflow_dispatch for `v3-unified-sequential-test.yml` on `main`. It logs only status, not a token, response body, headers or other secrets. The Master itself enforces GitHub `V3_MASTER_PAUSED` and safe no-AI/no-publish rules.

`workflow_dispatch` **does not count as event=schedule**. This fallback helps deliver the Master checks on time if GitHub's own event delivery lags; it cannot prove the GitHub scheduler itself works. GitHub's existing Master native cron can remain configured for failover; the read-before-write check limits duplicates. Racing delayed scheduled events can still result in a second queued Master run; existing `concurrency.cancel-in-progress=false` ensures they do not overlap, but this is **not** a strict distributed exactly-once lock.

## Activation requires separate approval, charges and a token
- Render Cron is a separate billable service with **at least $1/month minimum** (additional usage-based compute). The current workspace contains only the existing Render web service; no paid Cron was created during this PR. Do not provision it without explicit user approval.
- The user must create a fine-grained GitHub token scoped only to the repo with **Actions: write**. Store it as `V3_GITHUB_DISPATCH_TOKEN` **only in Render's secret environment settings** for the Cron job. Do not paste it into GitHub source code, issues, CI logs, ChatGPT messages or Supabase. Do not give it `Contents: write` or organization-wide access.
- Use the same repo/branch already connected to Render, Node runtime, build command `echo ready`, start command `node scripts/v3-github-dispatch-fallback.cjs`; schedule `4,9,14,19,24,29,34,39,44,49,54,59 * * * *`.
- After provisioning, manually trigger one Cron **with a safe test mode** only after verifying Github token and actions settings; confirm Github Master event=workflow_dispatch and all independent job outcomes. Check at least two naturally scheduled Render Cron events before declaring automation restored.
- The Render fallback does NOT run the production W01/W02/W03 publisher/AI pipelines; it dispatches the existing **test-only** Master and does not alter independent GSC/Safety/Quality schedules. Do not call those production providers every five minutes.

## Rollback
Disable or delete the Render Cron service and revoke its fine-grained token. This code remains inert until independently provisioned. Preserve existing GitHub native schedules for owner-controlled testing. Use `node scripts/v3-github-dispatch-fallback.test.cjs` for local no-network contract validation.
