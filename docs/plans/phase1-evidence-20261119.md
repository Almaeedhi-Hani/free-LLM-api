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

### 2026-11-20 00:15 KSA — GEO editorial kind rejection persists; second radar schedule is green

**W01 — confirmed failure and partial persistence:** [GEO run #44616857457](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44616857457) was `event=schedule` on main `0b6a386` at 2026-11-19T21:15:03Z. `[EVENT_CADENCE] RUN` recovered nominal `2026-11-19T13:00:00Z`. The full pipeline used **four existing bounded direct free-tier calls**, found 10 discovery candidates and 15 existing keywords, persisted **6 opportunities, 6 goals, 3 FAQ drafts**, and failed editorial: **English and Chinese each rejected one proposal with `unknown_kind`**, while Arabic proposed 0. The one available English validation repair reported **`quota_reached`**. `persisted_editorial_actions=0`, GitHub conclusion **failure**. No model call was made for this diagnostic.

**W01 — independent Supabase SELECT after event:** `content_store.updated_at=2026-11-19T21:16:09.034Z`, `drafts=20` versus 17 in prior snapshot, `editorialItems=40` unchanged, `faqs=2`. A visible count increase and exact timestamps support genuine draft persistence. **No editorial copy from this event**. The output guard still intentionally rejects `page`/`article`/unknown kinds; no automatic transformation or fabricated targets.

**W02 — second confirmed independent schedule:** [Market Radar run #44614779373](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44614779373) was `event=schedule` on `0b6a386`, created 2026-11-19T21:02:48Z (2026-11-20 00:02 KSA), job `RUN`, HTTP endpoint reported `status=completed` with `observations_recorded=5`. Later database total `competitor_observations=160` includes GEO discoveries around the same time and is not solely attributable to W02. W02's status stays accepted.

**W03/W05/W06:** No post-rollout `event=schedule` runs found in the GitHub run feed at the snapshot. Individual workflow enabled/disabled state and pause variables remain **unknown**, so cannot declare them disabled or operational. No policy or cron/quotas changed.

**Improvement in separate PR:** Share the authoritative persisted editorial kind enumeration with the direct-model prompt, provide a machine-readable allowed-values array and require omission rather than guessing or relabeling invalid kinds. Keep validation failure visible in pipeline until a real scheduled output succeeds. Test across AR/EN/ZH and existing single bounded repair attempt using local deterministic tests; **no extra provider/API calls**. Stage-1 acceptance remains **incomplete**.

**Publishing policy:** SELECT confirms `geo_publication_settings.daily_limit=3`, existing publication events=3, FAQ publication events=0. No changes applied. No Phase 2 work.

### 2026-11-20 01:17 KSA — phase 1.5: reconcile published D06 URLs with real production HTTP acceptance

**Confirmed through independent read-only Supabase SELECTs:**
- Three `public.geo_publication_events` records have `status=published`, `rolled_back_at IS NULL`, `language=ar`, and their exact `target_path` values are:
  - `/insights/investor-services-package-scope` — `item_id=ed-d73ce77f0c41204b3587ae7a`, kind `comparison`
  - `/insights/misa-registration-process-guide` — `item_id=ed-7efec0216e0874edefa14c25`, kind `guide`
  - `/insights/foreign-investor-company-documents` — `item_id=ed-50e540deda1f861607a39304`, kind `guide`
- All three IDs exactly match entries in `content_store.editorialItems` with `status=approved`, `lang=ar`, `approval_method=automated`, `reviewedAt` present and matching slugs. A separate full query for approved public `guide`/`comparison` items across all three languages found **exactly those three** at the snapshot. There were **no other approved publishable guides** across en/zh in that result.
- Production route logic in `src/app/sitemap.ts` includes those three approved guide/comparison URLs and **one** `/insights` hub, plus 24 baseline pages. `src/lib/editorial-workflow.ts` exposes the required `approvedEditorial` filter.

**Confirmed from actual production GitHub runner:** [post-merge production read-only acceptance #44619021109](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44619021109), on deploy revision `bcdf8e7`, succeeded at 2026-11-19T21:29 UTC (2026-11-20 00:29 KSA). `.github/workflows/production-readonly-acceptance.yml` sets `SEO_TEST_BASE_URL=https://free-llm-api-1-didl.onrender.com`, not local fixture. The verified `scripts/check-public-seo.cjs` obtains the production sitemap XML, iterates **each** of the four non-baseline URL paths and strictly asserts **HTTP 200** (plus language, H1, canonical, indexability), failing the run on any non-200. Its actual output: `PASS 24 localized pages` and `PASS 28-entry dynamic sitemap (24 baseline + 4 editorial)`. With three and only three approved public guides from the live database and one hub, this gives a source-reconciled HTTP 200 proof for **all three published paths**, without making external GET requests from the model runtime.

**Classification:** phase **1.5 acceptance satisfied for the three existing published paths as of this audit**; this is page reachability, not evidence of Google indexing, search traffic or AI citation. Future publications must be independently verified again. No content, publication events, quotas, provider calls, cron, or production database values changed.

**Still NOT met:** stage 1.4 source-of-every-attempt and W01↔W03 concurrency/idempotence evidence, and phase-1's six real schedule outcomes. W01 first actual schedule after PR #170 is not yet observed; W03/W05/W06 still have no post-PR167 schedule entries in the available run feed. Keep Phase 1 unchecked; no Phase 2.

### 2026-11-20 01:34–01:35 KSA — PR #170 real GEO scheduled regression and next bounded fix

**مؤكد:** [W01 event=schedule #44629829555](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44629829555) on main `45caf911c916e4249fd1b61edc785689d281e5e6` (PR #172 is documentation-only, same GEO code as PR #170) executed. GitHub job failure after real source calls within the normal assigned free quota: `discovery=10`, `evidence=296`, `persisted_opportunities=6`, `persisted_goals=6`, `persisted_drafts=3`, `persisted_editorial_actions=0`. The guarded publication-after-GEO step was **skipped** because the research stage failed.

**مؤكد — exact editorial rejection reasons:** AR `insufficient_text`, EN `insufficient_text`, ZH `invalid_technical_target`; the single AR repair attempt reported `quota_reached`. **No `unknown_kind` rejection** on this run, indicating that the prior prompt contract corrected that particular failure mode, not W01 as a whole. Keep the workflow failure truthful; never relabel/pad/fabricate editorial text or links.

**مؤكد — independent Supabase SELECT** at 2026-11-19 22:35:39 UTC: `content_store.updated_at=22:35:02Z`, draft items `22` (prior 20), editorial items `40` unchanged, FAQs `2`. The pipeline reports three draft save operations, but new net draft count is two; an upsert or update may explain this, **not independently proven**, so do not equate persisted operations to new unique rows.

**Code-only draft mitigation:** authoritative guard retains exactly the same `safeText` minima for title/summary/body per locale and identical accepted technical route pattern. Export those values/functions to the AR/EN/ZH direct model prompt as structured `editorial_text_contract` and `technical_target_contract`. A malformed/too-short proposal must be omitted, never padded or accepted by lowering thresholds. Deterministic tests require that the old guard rejects these inputs and the one existing repair attempt receives the identical contract. No diagnostic model/API calls.

**Separately verified phase-1.4 gap:** Both live publication commit RPCs lock rows and apply the shared 24-hour quota across editorial and FAQ, and both event tables have unique item+fingerprint constraints. However no D06 event attributes W01 vs W03 or GitHub run ID to **each attempted publication**. Existing `audit_logs` has RLS, service_role-only inserts and 0 rows; [Issue #173](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/173) scopes reuse, deterministic race tests and authenticated provenance. Do not mark W03 or 1.4 complete until real schedule + audit proof.

**Additional timeline:** main PR [#172](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/172) merged published URL reconciliation and Render LIVE SHA `45caf911`, with no production-code changes. W02 ran another independent successful schedule [#44629055528](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44629055528) at 01:29 KSA. W03/W05/W06 still lack post-PR167 schedule evidence in the retrieved feed; their enabled flags remain unknown. Phase 1 is incomplete; no Phase 2.

### 2026-11-20 — W01/W03 publication-attempt provenance / pre-RPC fail-closed design

**مؤكد / Supabase SELECT:** `audit_logs` is an existing table (id UUID, action, entity_type, entity_id, actor, metadata JSONB, created_at); RLS is enabled, `service_role` has INSERT/SELECT, while `anon`/`authenticated` lack INSERT. It had **0 rows** at baseline. No new table or schema migration is required. Editorial event count=3, FAQ events=0, no duplicate item+fingerprint pairs in either table. Owner settings stay `enabled=true`, `allow_high_risk=true`, `daily_limit=3`.

**مؤكد / deployed function metadata:** `geo_commit_auto_publication` and `geo_commit_auto_faq` each take a transactional `FOR UPDATE` lock on `geo_publication_settings` and `content_store`, then enforce a rolling 24-hour combined count over editorial+FAQ publication events. Each table has a UNIQUE(item_id,content_fingerprint) constraint and SQL still returns `already_processed` on repeat. Both functions use the existing PostgREST role hardening `current_setting('role',true)`, not the deprecated old claim guard.

**Implementation in phase-1 PR (unmerged at this checkpoint):** W01 and W03 attach allowlisted source name, GitHub run ID, attempt and event type to the **already authenticated** `POST /api/geo/auto-publication`. The worker stores PII-minimized `audit_logs` records: a single evaluation record for pre-RPC exclusions, a durable `rpc_started` record before any actual publication RPC, and a `rpc_result` record linking the start audit id and publication event id (when provided). FAQ questions are SHA-256 identifiers in the audit; full FAQ text, article bodies and credentials are never stored there. A failed initial audit prevents an RPC; missing/ambiguous post-RPC acknowledgments return errors, never cause blind retries. Authorized calls without metadata are explicitly marked `unattributed_api`, not falsely W01/W03.

**Evidence boundary:** This change has deterministic contract and mocked HTTP tests and uses the existing schema, but no live W01/W03 scheduled run or source-attributed D06 readback is yet available on it. No production publication RPC was manually exercised and no external search/AI provider was called. True concurrent transactions remain untested in an isolated database. Do not consider Phase 1.4 complete or proceed to Phase 2 until CI/Evals + real scheduled data and concurrency acceptance pass. See [Issue #173](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/173).

**No policy or quotas were changed.** Daily limit 3, allow_high_risk=true and source-optional publication stay as approved; no security or database migration, deletion, rollback or write to live Supabase was performed for testing.

### 2026-11-20 02:27 KSA — W01 first fully successful GEO schedule after #174

**Confirmed from GitHub Actions:** [run #44637825373](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44637825373) is `event=schedule` on current main `1f7d27e834450a7702173c68199c7605bb58ae95`, completed **success**. GEO full pipeline summary: discovery=10, evidence=312, `persisted_opportunities=3`, `persisted_goals=3`, `persisted_drafts=3`, `persisted_editorial_actions=3`; zero unacknowledged editorial rejects in this run. Independent post-GEO publication endpoint returned `status=completed`, `published=1`, and `quota_reached` for a later candidate, with no blind retries. Publication was on **/zh/**, not an SEO guide.

**Confirmed from production Supabase SELECT at 2026-11-19 23:29:17 UTC:** `content_store.editorialItems=43`, `drafts=25`; `geo_publication_events=4` vs prior 3; newest `item_id=ed-d885c7a69462f267fab5cc9a`, target `/zh/`, language `zh`, `status=published`, published at `2026-11-19 23:28:30.341107 UTC`, `rolled_back_at=null`. `geo_publication_settings.daily_limit=3` remained unchanged. `audit_logs=0` because provenance PR #175 was still in Draft at the time: this cycle validates W01 workflow + publisher, **not** W01/W03 attempt audit lineage.

**W01 acceptance:** Mark [x] for its one real successful scheduled full pipeline and saved data. W02/W04 are already accepted. Keep **overall stage 1 unchecked**: W03/W05/W06 still lack qualifying post-fix scheduled runs and stage 1.4 source-attributed concurrent publication audit is not proven yet. A source-authentication/audit PR must complete all CI/Evals, be deployed, and survive a real schedule with D06 audit readback; a passing mock cannot close that gate.

### 2026-11-20 03:19 KSA — four real schedules accepted, W03 production audit lineage

**مؤكد W01, after #174:** [GEO schedule #44637825373](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44637825373) on `1f7d27e`, created `2026-11-19T23:27:36Z`, logged `[EVENT_CADENCE] RUN`; the completed GEO pipeline persisted **3 opportunities, 3 goals, 3 FAQ drafts and 3 editorial actions** with zero rejected editorial actions. The same workflow's publisher endpoint replied `published=1`. Supabase D06 editorial event for `/zh/` has `published_at=2026-11-19T23:28:30.341107Z`. This schedule predates the publication provenance PR #175, so it does **not** demonstrate W01 source header/audit attribution.

**مؤكد W03, first valid run on provenance release:** [publication schedule #44641523397](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44641523397) on `e8893a7b682a4db826b737dbbfc66e65a8421b83` (Render LIVE), created `2026-11-19T23:54:38Z`, logged `[EVENT_CADENCE] RUN kind=publication` and actually executed the HTTP publisher. Its response was `status=completed,published=2`, not a silent skipped-job success. Supabase D06 now includes two newly published Chinese-target records at **23:54:56 UTC** (`/zh/packages`) and **23:54:58 UTC** (`/zh/services/company-formation`); total D06 published items = **6** (3 historical + one W01 + two W03), FAQ publication events = 0.

**مؤكد W03 audit source + event join in production:** `audit_logs` contains **10** W03 records, all with `source_workflow=W03`, `github_run_id=44641523397`, `event_type=schedule`: four `geo_publication_evaluation` (all `requires_finished_visitor_copy`), three `geo_publication_rpc_started`, three `geo_publication_rpc_result`. Two `rpc_result` records have result `published`, and their `publication_event_id` each resolves to an actual `geo_publication_events.id` (verified with LEFT JOIN). The third `rpc_result` says `quota_reached` and intentionally has no matching publication event. No duplicate `(item_id,content_fingerprint)` groups. **Exactly 3 published events in the latest 24 hours**, against unchanged owner `daily_limit=3` and `enabled=true`; no excess or blind retries observed.

**Boundary / do not overclaim:** W03 provenance is verified for this run, but no post-PR175 scheduled W01 provenance yet (W01's valid publication preceded it) and no two simultaneous W01/W03 live database transactions tested on an isolated environment. Shared DB `FOR UPDATE` locks, UNIQUE constraints and the rolling cap support the design; they do not replace a real concurrency test. Phase 1.4 is still pending.

**مؤكد W04 added actual Google impressions:** [GSC schedule #44643584048](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44643584048) on `e8893a7` created `2026-11-20T00:09:45Z`, logged real cadence `RUN` and stored **2026-11-17** with `success_with_data`, `attempts=1`, `rows_fetched=4`, dimensions `total,page,country,device` (one row each) with **3 impressions and 0 clicks**. Do not add impressions across these four representations: they are the same source total split by dimensions. November 15–16 remain zero. No query/page_query rows. `gsc_sync_day_outcomes=3` days total.

**Publication URL check boundary:** historical acceptance [#44619021109](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44619021109) proved HTTP 200 for the **three original** /insights editorial URLs and the /insights index. The three newly published Chinese target paths have not yet been independently HTTP-200 verified *after* the W01/W03 publishing events: direct model/web access returned no usable HTTP status, not a proven server failure. A new post-publication CI GET readback is needed to re-close 1.5.

**Phase 1 status:** W01, W02, W03, W04 now each have one genuine successful `event=schedule` + persisted result (or relevant no-work) evidence. W05 and W06 still lack a new schedule on the corrected branch in the retrieved GitHub feed. **4/6 technically accepted**, but **Stage 1 exit remains UNMET** due W05/W06, live concurrency/provenance acceptance and fresh published-link verification. No Phase 2, no production mutation during this inspection, no external model/search provider quota consumption, no alteration of policy or daily_limit=3.

### 2026-11-20 03:26 KSA — post-publication HTTP 200 for all six D06 target URLs

**مؤكد:** Docs-PR [production read-only acceptance #44645801766](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44645801766) ran **after** W01's 02:28 and W03's 02:54 KSA new Chinese publications, using the true production URL as both `SEO_TEST_BASE_URL` and `SITE_URL`. The step `Verify live multilingual pages and every indexed guide` passed. `scripts/check-public-seo.cjs` asserts **HTTP 200 by individual GET** for all 24 canonical localized baseline paths (ar/en/zh and 8 paths per locale), explicitly including `/zh/`, `/zh/packages`, and `/zh/services/company-formation` (the new D06 publication targets), and for 4 additional editorial sitemap pages (the 3 previously published `/insights/*` URLs and the `/insights` index). Its run log reports `PASS 24 localized pages` and `PASS 28-entry dynamic sitemap (24 baseline + 4 editorial)`; protected endpoint check also passed.

**Outcome:** All **six** `geo_publication_events` published target paths have a post-publication HTTP-200 check, without conflating *event publication* with a *new path in sitemap*: three Chinese target routes are preexisting localized pages changed by publishing, whereas the original three `/insights/*` are additional sitemap editorial URLs. **Phase 1.5 can be marked [x] for HTTP reachability**. The test does not prove Google indexing or that a particular text fragment rendered without a separate editorial-content assertion. This verification was GET-only and consumed no model/search provider quota.
