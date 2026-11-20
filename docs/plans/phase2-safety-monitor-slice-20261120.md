# Invest in Saudi V3 — Phase 2 safety monitor (first implementation slice)

Date: 2026-11-20. Repo: `Almaeedhi-Hani/free-LLM-api`. This is an **implementation proposal, not a Stage-2 exit certificate**.

## Implemented for review in this PR

- A new `.github/workflows/v3-phase2-safety-monitor.yml` reads all six true `event=schedule` GitHub Action histories every six hours; it excludes `push` and `workflow_dispatch` from proof. Expected schedule cadence is two hours until 2026-11-22 00:00 Asia/Riyadh, four hours thereafter. An incident is eligible only if **more than two cadence intervals** have elapsed since the latest successful schedule, with no newer queued or running schedule. A stable per-Wxx issue title prevents issue duplication, and healthy runs close the matching incident.
- A `workflow_run` observer raises and resolves per-workflow scheduled-failure alerts, verifying the exact main branch, same repository and `event=schedule`. It does not rerun a failed job.
- A Sunday 09:00 Saudi weekly issue uses fixed Sunday-start Saudi week IDs; the report includes six schedule statuses and separate persistence observability. **Absent keyword, AI, GSC, evals or provider-quota data is reported unknown**, never fabricated.
- A `workflow_dispatch` in `dry-run` mode executes deterministic offline tests but **does not create issues**; explicit `watchdog`/`weekly` can reconcile real issues.
- The reporter makes no AI/search provider calls and does not change publication, GitHub Variables, the dashboard, quotas, Supabase schema, pricing or content.

## Persistence readback and its limitation

For W01–W04, Supabase PostgREST GET queries use the *already-existing* service key only when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` **are supplied to this job**. They return timestamps only (W01 `content_store.updated_at`, W02 successful `analysis_runs.finished_at`, W03 latest `audit_logs.created_at`, W04 `gsc_sync_day_outcomes.checked_at`). **No persistence success is claimed if credentials are absent or the read fails**; the report says `unknown`. The W03 audit timestamp is not yet filtered to W03 source and should be treated as a broad activity indicator, not W03-only publication proof. W05 index may legitimately be `no_change` without a database write. W06 bounded maintenance can likewise be `no_change`.

Security: do not install a new database service key merely to make the report look healthy; owner approval and least-privilege access review are required before configuring any missing credential.

## Required before Stage 2 completion

- [ ] Test a real schedule-driven watchdog cycle and one actual weekly report issue, verifying GitHub delivery.
- [ ] Confirm authenticated read-only persistence access and **source-specific** W01–W04 evidence; do not label GitHub workflow success as DB success.
- [ ] Separate quality alarms for competitor links in visitor pages and V3 Evals failures.
- [ ] Master Pause across six workflows and the existing pause flags with a safe owner-only UI, without expanding website GitHub Variables token access.
- [ ] Free-provider per-provider 80% caps with audit trail, without increasing usage or switching to paid accounts.
- [ ] CI, browser acceptance, safe alert simulations and real Stage-2 exit evidence. Do not begin Phase 3 production integration before this gate.

## Parallel work and handoffs

The owner authorized working on stages 2 and 3 in this conversation while a second conversation prepares UI stages 4 and 5. This PR is limited to **new safety script/workflow, admin-regression test insertion, and this stage-specific documentation**. It deliberately does not modify `src/app/admin/dashboard/page.tsx`, `PROGRESS.md`, packages, or repository admin navigation to avoid collisions. The separate Phase-3 branch remains **draft and offline-only** until Stage 2 acceptance. Owner security migration 1.6 remains unapplied.
