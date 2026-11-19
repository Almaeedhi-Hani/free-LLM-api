# Phase 1 — production reliability evidence ledger (2026-11-19, Asia/Riyadh)

**Status: IN PROGRESS, exit gate not met.** Branch: `codex/phase1-scheduled-reliability-20261119`, [PR #167](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/167), baseline `main` SHA `c0ad3444fb04acd08d25e1ce11e6e7e6cf4217b1`. Verified genuine rollback tag `pre-phase1-20261119` points exactly to the baseline SHA. Temporary tag-generating workflow was removed from the PR before implementation.

## Evidence labels

- **مؤكد**: direct evidence from actual workflow job logs, code, DB SELECT, test or documented GitHub tag.
- **مستنتج**: causal explanation consistent with observed evidence; do not label it a complete root cause without independent proof.
- **غير معروف**: missing evidence or inaccessible permissions; do not substitute assumptions.
- **No external search/AI provider calls were made for diagnostics**, and no live database writes or live workflow dispatches were performed.

## W01–W06 evidence — read-only snapshot before this PR is merged

| ID | Last retrieved real schedule run | GitHub conclusion | Actual work/save evidence | Acceptance |
| --- | --- | --- | --- | --- |
| W01 GEO | [#44433835045](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44433835045), 2026-11-19 01:02 UTC | failure | Step `Analyze GEO with direct free-plan provider fallbacks` failed on older commit; cannot prove PR #156 generation/persistence in a new schedule | **FAIL/pending** |
| W02 Market Radar | no independent `event=schedule` run among retrieved schedule events | unknown | Supabase `analysis_runs` has one `radar` and one `full` at 2026-11-19 ~08:59–09:00 UTC (`triggered_by=cron`); `runRadar` invokes `runMarketAnalysis`, so those are not proof of two independent schedules. No run ID association | **PENDING** |
| W03 Guarded publication | [#44546805433](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44546805433), 2026-11-19 14:43 UTC | success **but no publication step** | Job log: `[CADENCE] SKIP event=schedule slot=even phase=two-hour`; publisher HTTP step skipped. **Confirmed silent no-op caused by wall-clock gating after delayed GitHub start** | **FAIL/pending new version** |
| W04 GSC | [#44460349477](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44460349477), 2026-11-19 04:44 UTC, older commit | success | `gsc_daily_metrics`: 5 `total` rows for 12–16 Nov; `gsc_sync_day_outcomes`: **0**; page and page_query: **0**; hence new atomic backfill has no persisted evidence | **PENDING** |
| W05 LLM index | [#44503133016](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44503133016), 2026-11-19 10:10 UTC | success | `[CADENCE] RUN`; log confirms `No meaningful machine-index changes; no PR.` = legitimate read-only **no_change** decision; no fabricated write | **Provisional on older commit** |
| W06 Autonomous maintenance | [#44508302894](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44508302894), 2026-11-19 10:43 UTC | success | `[CADENCE] RUN`; log confirms `No additional safe technical work. No empty PR.` = legitimate **no_change** decision; no fabricated write | **Provisional on older commit** |

### GSC correction included in PR #167 — no Google API probes

- **مؤكد:** Existing W04 uses `scripts/gsc-scheduled-slot.cjs` with immutable GitHub run metadata, not `Date.getHours()`; no need to replace this correct gate.
- **مؤكد:** Existing `planGscCatchup` selects days from stored `gsc_sync_day_outcomes` (missing, failed, no-data recheck), attempts max **2 days per run**, uses day `now-3` as eligibility ceiling, retries `success_no_data` after 3 days for the first attempt and 7 days on subsequent attempts, and collects page and page_query dimensions separately.
- **مؤكد:** Before fix, the live endpoint chose an initial 60-day-old start even though the approved recovery floor was **2026-11-15**, wasting free quota on irrelevant pre-baseline dates. PR fixes the **earliestDate floor only** and retains moving 60-day reporting horizon and two-day quota cap; the target first recovery is **Nov 16 and Nov 15** (for Nov 19 reference clock). Adds a pure deterministic regression.
- **غير معروف:** Whether the current Render environment still has `GSC_BACKFILL_ENABLED` present and set; the available Render connector exposes an update action but not readback of service environment values. Do not log or disclose any secret.
- **PENDING:** next actual W04 `event=schedule` on deployed corrected version and SQL readback from both D07 tables.

### W03 / W05 / W06 event-slot correction — same absolute UTC cron times

- **مؤكد:** W03's newest real scheduled run was marked `success` although its **publication step never ran**. The log confirms `SKIP` from `scheduled-cadence-gate.cjs` using runner time.
- **مؤكد:** W05/W06 still use the same runner wall-clock gate. They happened to run on their last observed events, but a delayed event can be silently skipped.
- PR #167 expands each existing 2h cron expression to **12 equivalent UTC hour-specific cron expressions**, keeping the exact original times and frequency, and directs the gate to `scripts/scheduled-event-slot.cjs`, which reconstructs the nominal slot from `github.event.schedule` plus immutable GitHub `run.created_at`. Reruns (`GITHUB_RUN_ATTEMPT > 1`) do not repeat work.
- **No cadence changes:** every two hours until 21 Nov, then every four hours from **22 Nov 00:00 KSA**, as previously approved. No provider/model/quota changes.
- **PENDING:** PR CI acceptance/Evals and genuine schedule results after deployment. A passing simulation does not establish schedule delivery.

### Publication idempotency and owner policy

- **مؤكد from Supabase SELECT:** `geo_publication_settings` is `enabled=true`, `daily_limit=3`, `allow_high_risk=true`. **Do not change these.**
- **مؤكد:** Both `geo_publication_events` and `geo_faq_publication_events` have unique `(item_id, content_fingerprint)` constraints. Three existing published editorial events contain three distinct pairs; FAQ events have no published sample.
- **غير معروف:** A concurrent W01/W03 production race has **not** been reproduced, and D06 tables have no explicit source-per-attempt field. A unique constraint on published items is not proof that every attempt was provenance-labeled. Need additional additive provenance design/owner review before claiming full 1.4 completion.

### Production public-page HTTP GET

- **مؤكد:** The three published D06 paths at snapshot are:
  - `/insights/investor-services-package-scope`
  - `/insights/misa-registration-process-guide`
  - `/insights/foreign-investor-company-documents`
- **غير معروف:** Direct GET from this model runtime failed due network/DNS/tool accessibility, not a returned HTTP status; do **not** count this as 200 or 404.
- Existing `scripts/check-public-seo.cjs` runs in GitHub `production-readonly-acceptance.yml` and tests dynamic published sitemap entries with GET and `200`. Capture new CI run proof, and independently reconcile the published item count against D06 before completing 1.5.

### Independent security hardening — proposal only

- **مؤكد from live function metadata SELECT:** `public.rls_auto_enable()` is `SECURITY DEFINER`, with privileged EXECUTE inherited by anon/authenticated; `public.geo_set_updated_at()` lacks pinned `search_path`.
- An **unexecuted** SQL proposal is in [security/phase1-hardening-proposal.sql](security/phase1-hardening-proposal.sql). It revokes EXECUTE from PUBLIC/anon/authenticated for the definer function and pins the trigger lookup path to pg_catalog.
- **NOT applied**: requires separate explicit owner approval after schema and deployment review. It is not in the active `supabase/migrations/` folder. No private RLS table policy expansion.

## Phase 1 exit gate — NOT MET

All six W01–W06 must be evidenced on a live, correctly deployed version with actual `event=schedule` outcomes. Confirm real data persistence or a traceable `no_change` outcome for non-writing tasks. W01, W02, W03 and W04 remain unresolved. No Phase 2 work or claim of production reliability until the evidence is collected and entered here and in PROGRESS.md.

### Next diagnostics (safe, no provider quota burn)

1. Review PR #167 CI, V3 Evals and browser acceptance; fix only proven failures.
2. If authorized to merge the implementation PR, verify the real deployed SHA on Render; then observe the next scheduled W01–W06 events.
3. Confirm whether W02 is enabled/paused using a permissioned configuration metadata-only read. The current GitHub connector did not expose private workflow state or repository Actions Variables via read methods; **the reason for missing schedules is not yet proven**. Do not report a guessed cause.
4. Recheck GSC outcomes, candidate dimensions and source dates using SELECT only.
5. No manual GEO dispatch unless owner instructions explicitly permit one after a missed schedule and it does not conflict with the no-quota-burning rule.

## 2026-11-19 — Phase 1 QA checkpoint, after FAQ test repair

**Confirmed:** Previous #44564941315 isolated browser failure was an asynchronous POST identification problem or an underlying FAQ flow issue; the exact root cause is **not independently proven**. The acceptance test now captures a POST whose authoritative `faqs` array omits only the target question, requires exactly one fewer entry, checks HTTP 200 and the server's updated response, and independently GETs the persisted state. This test **passed** at [browser run #44569481884](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44569481884). Production FAQ code was not changed.

**Confirmed:** All six checks on SHA `0ef9d880e6720dfde60756516ab3100c7fe0df3b` passed: Admin regression #44569481791, GSC integration #44569481811, V3 Evals #44569481734, Phase2 SQL #44569481839, Production GET #44569481851 (retry), Browser #44569481884. The production read-only runner's first attempt observed HTTP 502 for `/services/premium-residency` after a passing health test; a bounded GET-only rerun succeeded, so this transient response should not be silently erased from reliability tracking. Render was not modified by the rerun.

**Next required gate:** validate the final PR commit's CI checks before merge; then deploy the schedule code through this PR under the authorized phase, confirm Render revision, and record actual `event=schedule` runs with database evidence. No stage 2 work or false declaration of stage 1 completion.

## 2026-11-19 — first actual scheduled runs on released #167 (21:11–22:16 KSA)

**Confirmed from production release:** Render LIVE revision `b3b14cf16d76839b8dcb15f8e6cbda628a4cba01`. The following are **event=schedule** on that SHA, not manual dispatch or push.

| System | GitHub Actions | KSA time | Verified result |
| --- | --- | --- | --- |
| W01 GEO | [#44585116258](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44585116258) | 21:11 on 19 Nov | Failure after partial legitimate writes: discovery 10 candidates/15 existing keywords; 5 opportunities, 5 goals, **3 drafts** persisted. No valid editorial action persisted; **3 malformed proposals rejected**, explicitly reported (not silently discarded). Complete cycle FAIL. |
| W02 market radar | [#44595877385](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44595877385) | 22:12 on 19 Nov | **SUCCESS with actual persistence**; job step triggered /api/cron-market, HTTP success, run completed. Supabase analysis_runs 2→4 (nested `radar` + `full` for the same operation), competitor_observations 120→135 (then 145 in later SELECT), opportunities 54→59, and later 65 including GEO results. Market Radar schedule is therefore enabled/running; the reason earlier slots were missing is **still unknown**. |
| W04 GSC | [#44574400340](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44574400340) and [#44593004607](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44593004607) | 20:11 and 21:56 | **FAIL**; `curl` HTTP 502 from app, sanitized app error `gsc_atomic_rpc_gsc_sync_commit_day_400`. Not a successful empty day; day outcomes remain 0, page measurements remain 0. |

### Root-cause evidence for W04 — PostgREST role claim mismatch

- **Confirmed from Supabase edge_logs:** REST `/rest/v1/gsc_sync_day_outcomes` GET returned **200**, and `/rest/v1/rpc/gsc_sync_commit_day` returned **400** twice. Both request JWT role and key role were **service_role**. Never print authorization key values.
- **Confirmed from Supabase postgres_logs:** failures are SQLSTATE `P0001`, in `public.gsc_sync_commit_day(text,date,text,timestamptz,integer,jsonb)` line **9** at `RAISE`. The first guard in the deployed PL/pgSQL function is `current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'`, while Supabase's current context provides the role in `request.jwt.claims`. The guard is rejecting a legitimately authorized `service_role` request. This is **not** a missing table and not missing API credentials.
- **Confirmed from DB metadata:** both original functions exist, have `SECURITY INVOKER`, are executable by service_role and **not** anon; the proposed `_v2` signatures do not exist in production. The new document `gsc-role-rpc-v2-owner-approval.sql` defines add-only **new** functions using `current_user IS DISTINCT FROM 'service_role'`. The former `_v1` functions, all rows, constraints and RLS remain untouched. Existing `GSC_BACKFILL_ENABLED` and the two-day/run budget are unchanged.
- **Approval/deployment blocker:** SQL proposal has **not** been run or added to the live migration chain. Matching client adapter and tests are prepared in a separate Draft PR, **not to be merged before explicit production schema authorization and application**. After approval, run the new SQL through the controlled migration process, verify signatures/role grants with SELECT, then merge the client adapter PR and observe scheduled commit+readback. This functional migration is **separate from the pending stage 1.6 security migration**, which also remains unapplied.
- **No external Search Console or free search/LLM provider calls were made for diagnostics.**

### GEO observations (W01)

- **Confirmed:** first scheduled run after PR #156 did carry out a substantial portion of the pipeline and persisted 5 opportunities, 5 goals and 3 FAQ drafts. This is a genuine improvement over a no-op.
- **Confirmed:** the last editorial stage returned `partial` because all 3 generated proposals were rejected as malformed. It logged rejection count and pipeline status and uploaded a sanitized report artifact. It did **not** quietly publish these proposals.
- **Still pending:** exact rejection reasons per proposal, successful editorial persistence on a real schedule, and completed W01 status. Do not make the success flag green by ignoring malformed outputs or inventing editorial copy.
- **Confirmed later SELECT:** `content_store.drafts=17`, `editorialItems=40`, `faqs=2`, `opportunities=65`, `agent_goals=51`, `competitor_observations=145`. These aggregate values are not all attributable solely to the one W01/W02 run without item IDs. Preserve that uncertainty.

### Phase gate after new evidence

- **W02 is accepted for one actual successful schedule plus data write.** Mark W02's table checkbox only.
- W01 still FAIL after a partial write; W04 FAIL due service-role guard; W03/W05/W06 have no post-merge `event=schedule` evidence in the retrieved snapshot.
- **Phase 1 exit remains BLOCKED.** No Phase 2 work, no schema mutation, no policy/daily-limit change, no provider/quota diagnostic calls.

### 2026-11-19 functional GSC V2 schema rollout (approved phase-1 scope only)

**Confirmed:** Following owner's instruction `التالي` to the specific GSC functional-migration checkpoint, the strictly additive migration was prepared at `supabase/migrations/20261119194500_phase1_gsc_rpc_service_role_v2_20261119.sql`. The SQL content is exactly equivalent to the previously reviewed proposal, except the managed migration has no explicit nested BEGIN/COMMIT. All **6 PR checks** were green at head `0f949e89ffd1578f987df1ced2607ba62e653ca3` before applying it.

**Confirmed from Supabase:** `apply_migration` succeeded; name `phase1_gsc_rpc_service_role_v2_20261119`, recorded migration version `20261119194500`. Both `public.gsc_sync_commit_day_v2` and `public.gsc_sync_verify_day_v2` now exist, retain `SECURITY INVOKER` and a fixed empty `search_path`, and check trusted `current_user='service_role'`. Both allow EXECUTE to `service_role` while `anon` and `authenticated` have no EXECUTE. V1 functions were preserved with their original privileges and definitions. Security advisories for the two unrelated functions `public.rls_auto_enable` and `public.geo_set_updated_at` remain outstanding and were NOT changed by this migration.

**Data conservation:** Immediately after migration, `gsc_sync_day_outcomes=0`, `gsc_daily_metrics=5`, page=0, page_query=0 — identical to the earlier baseline. **No Google/Search Console provider call was made to test the schema**, and no artificial GSC rows were inserted. A live GSC schedule cannot use these new functions until PR #168's client adapter has been merged and Render deploy confirmed.

**Next gate remains mandatory:** Recheck 6/6 CI on final PR head after documentation update; merge only after green checks, confirm Render revision, and verify first `event=schedule` W04 run plus actual outcomes and page/query metrics or verified no-data state. W01 remains a separate rejected-editorial issue and W03/W05/W06 schedules must be verified. Stage 1 is NOT complete; stage 2 must not start.

### 2026-11-19 22:56 KSA — V2 client deployed, schedule outcome still pending

**مؤكد:** After the successful managed additive Supabase migration `20261119194500`, PR [#168](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/168) was merged at commit `08fd957654796a03129178763ed19782ff3c2436` on 2026-11-19 19:55:05 UTC, with 6/6 pre-merge CI/acceptance/Evals successes: [V3 #44602215293](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44602215293), [SQL security #44602215268](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44602215268), [admin regression #44602215551](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44602215551), [production acceptance #44602215437](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44602215437), [GSC #44602215427](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44602215427), [browser #44602215262](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44602215262).

**مؤكد:** Render deploy `dep-dbvl86p42hec73aonif0` is **Live** on exact `08fd957` at `2026-11-19T19:56:28.818067Z` (22:56 KSA). Fresh Supabase SELECT at `2026-11-19T19:56:22Z` showed `gsc_sync_day_outcomes=0`, page rows=0 and page_query rows=0. No post-merge GSC `event=schedule` on `08fd957` yet in the retrieved GitHub feed. Therefore **W04 is not accepted**, despite deployed code and schema. No provider or synthetic DB probes performed.

**مؤكد:** Post-merge GitHub `push` Admin regression [#44603265643](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44603265643) passed. Production read-only acceptance [#44603265521](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44603265521) was still `in_progress` at last check. The former W01 editorial and W03/W05/W06 schedule evidence gates remain open.

**Safety:** Do not re-run migration `20261119194500` (already in Supabase migration history), do not modify owner publication settings (limit=3), do not execute the separate stage 1.6 security proposal. Observe the next actual scheduled W04 cycle and use only SELECT readbacks; do not mark phase 1 complete or start phase 2 until all six have genuine evidence.

### 2026-11-19 23:02 KSA — first verified W04 live schedule with atomic DB writes

**مؤكد:** [GSC scheduled run #44604512378](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44604512378) was **event=schedule**, `head_sha=08fd957654796a03129178763ed19782ff3c2436`, **completed/success**. The job log proves `[GSC_CADENCE] RUN reason=scheduled_slot slot_utc=2026-11-19T12:00:00Z` even though GitHub actually started the runner at `2026-11-19 20:02:24Z` (delayed nominal slot recovered). Claim step and `Collect GSC metrics` succeeded. Application HTTP response `status=completed`, `attempted=2`, `remaining=0`, `eligible_through=2026-11-16`, no day failure.

**مؤكد — independent Supabase SELECT:** Two fresh rows in `gsc_sync_day_outcomes`, dated **2026-11-15 and 2026-11-16**, status `success_with_data`, `attempts=1`, `rows_fetched=1` per day, both `checked_at=2026-11-19T20:02:36.167Z`. `gsc_daily_metrics` matches these exact dates and timestamps with **one `total` row per day**; `clicks=0`, `impressions=0` on both, and **zero** rows with dimensions query, page or page_query. The source did not supply those fine-grained rows. Do **not** label this organic traffic or infer any search ranking.

**W04 assessment:** Proven functional automated schedule, two successful atomic commits, exact readback, and bounded quota (2 days/run), while **measurement coverage is zero beyond total**. W04's initial technical acceptance is marked [x], with an explicit data-quality note. Monitor subsequent real days until Google supplies actual impressions/page/query rows. This does not waive other W01/W03/W05/W06 gates.

**PR #169** separately updates this evidence and PROGRESS. Six CI/acceptance/Evals checks are required on its final SHA before merge. No provider-testing calls or production writes were made here; only the native GitHub schedule performed the authorized GSC production sync.
