# Stage 2 — GitHub Actions readback credentials: availability blocker and alert

Date: 20 November 2026. Applies to the Stage-2 watchdog/weekly report only.

## Independently observed failure

The isolated [GitHub Actions run #44782864479](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44782864479) ran the **existing offline monitor tests successfully**, then attempted only the exported **read-only** W01–W04 and weekly reporter PostgREST GETs. In that exact branch/job environment, both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were empty/unavailable. All of the W01–W04 storage readbacks, weekly GSC total/page and keyword feedback returned `unknown`. The integration check correctly finished **failure / exit 2** rather than claiming persisted measurements. No GitHub Issue was created, no provider called, no page published and no production database changed. Its isolated workflow was deleted from its branch after inspection; **never merge it onto main**.

These facts **do not prove the repository secrets were deleted or generally absent**; they may live in a protected GitHub Environment, be saved under other names, or be unavailable to a feature branch. Access to Actions secret metadata was not available from the connected GitHub fetch tool.

## Safe monitor behavior

A narrow pre-existing watchdog enhancement now raises *one named deduplicated Issue* only if, in a **complete six-workflow watchdog pass**, the four required readbacks **all** return the exact credential-unavailable state. It describes only the required variable **names**, not their values. Repeating the same condition updates the same Issue. After all four are observed, the config Issue is resolved. During an explicit owner pause, there is no new config alert. Network failures, partial observations, malformed data and W05/W06 legitimate no-change cannot be misclassified as the same secret issue.

This is distinct from the existing W01–W04 schedule/persisted-output alarms. It neither creates read access nor changes the user's quota/publication settings. **It is not proof that readbacks work**, just a precise, actionable failure mode if they do not.

## Owner/security checkpoint

Before acceptance, verify the actual **main-branch scheduled** watchdog's readback and the GitHub Actions environment from which it runs. If unavailable, arrange narrowly authorized **read-only** access via a vetted endpoint or approved GitHub secret scope. Avoid adding Supabase `service_role` tokens to frontend code, logging/printing keys, opening public RLS grants, or copying secrets into this Issue. The current script requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` names at run time; a least-privilege alternative requires its own security review and implementation.

First real watchdog scheduled cron `17 */6 * * *` has a nominal 18:17 UTC (21:17 KSA) slot on November 20; GitHub may delay actual execution. First Sunday `[V3 weekly]` schedule is November 22 06:00 UTC. Neither event has been proven successful merely by the isolated failing test or by a green code PR.

**Stage 2 still open:** true schedule and report evidence, quality-watch cycle, owner-safe Pause UI, and verified atomic per-provider daily 80% limits remain outstanding. Stage 3/4/5 code is separate. No production SQL migration, policy, cron or external-provider budget changes were made in this branch.
