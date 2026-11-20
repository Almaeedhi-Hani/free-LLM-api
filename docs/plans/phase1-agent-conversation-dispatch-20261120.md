# Invest in Saudi V3 — independent agent conversations, Phase 1 only

**Status:** Prepared dispatcher, not launched Codex sessions. **Owner-approved mode A remains in force:** stop at Phase 1 checkpoint and ask owner before Phase 2.
**Coordinator / single results inbox:** [GitHub Issue #180](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/180).
**Original orchestration contract:** [docs/v3-multi-agent-execution.md](../v3-multi-agent-execution.md).

## What is and is not running

The task conversations below are GitHub Issue discussions containing self-contained instructions. This repository file and those GitHub discussions **do not create independent Codex/ChatGPT Work sessions or run agents**. The operator must start a fresh Codex/Work conversation for each worker using its linked Issue; paste the starter command below; record the resulting conversation URL in #180. Agent 0 then collects issue/PR evidence and consolidates the Phase-1 checkpoint. Do not represent prepared issues as living agents.

Current dispatch baseline observed 2026-11-20: main and Render LIVE `b93bd4348909e8e215bab41dd511e35c02d5c785`. PR #177 (W05) and #178 (W01) are merged and live. [PR #179](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/179) is a test-only open draft, with **7/7 green checks** at dispatch; it requires coordinator review/merge. No post-fix W01/W05 schedule accepted yet. Re-check reality before every task.

## Parallelism and exclusive files

- Exactly **Agent 0 coordinator**, up to **three concurrent code-writing workers** (W01, W05, publisher) in independent branches/worktrees and conversations; Agent 6 QA is **read-only** and may run in parallel.
- No shared writable checkout. **Coordinator exclusively owns** `docs/plans/PROGRESS.md`, `docs/plans/phase1-evidence-20261119.md`, this dispatch document, common workflows/migration/release operations. Workers comment in their Issues; Agent 0 commits consolidated evidence after verifying it.
- Worker PRs must be **draft**, with offline or isolated tests and CI/V3 Evals. No autonomous merges or deploys. The owner policy wins if this document conflicts with the repository's root AGENTS.md.

## Independent conversation entrypoints

| Session / role | Dedicated GitHub conversation | Primary responsibility | Current gate | Writes |
| --- | --- | --- | --- | --- |
| Agent 0 — coordinator | [#180](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/180) | Freeze moving main/Render evidence, review PRs, dedup, consolidate SQL/CI and request owner sign-off | Stage 1 completion | PROGRESS/evidence only |
| Agent W01 — GEO quality | [#146](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/146) | Post-#178 real W01 scheduled run, persisted content, bounded fix if new confirmed failure | W01 accepted success with saved counts | GEO code only if proven |
| Agent W05 — feed index | [#171](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/171) | Post-#177 W05 scheduled `RUN`, `verified`, meaningful-change/no_change proof | W05 genuine post-deploy schedule | W05 code only if proven |
| Agent publication — idempotency | [#173](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/173) | Review PR #179 isolated SQL race, read source-aware W01/W03 audits | Real W01-origin production audit after PR #175 | Publisher isolated tests only if proven |
| Agent 6 — final independent QA | [#150](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/150) | Cross-check main, Render, schedule W01–W06, Supabase SELECT, GET 200, unresolved gates | Independent acceptance matrix | Read-only |

## One universal starter message for each **new** Codex/Work conversation

> أنت الوكيل المسؤول عن المهمة الموجودة في رابط GitHub Issue التالي: **[ضع رابط Issue الخاص بالوكيل فقط]**. اعمل في محادثة مستقلة ولا تعدّل نطاق أي وكيل آخر. ابدأ بقراءة AGENTS.md وdocs/v3-multi-agent-execution.md وdocs/plans/automation-and-consolidation-plan.md وdocs/plans/PROGRESS.md وأحدث main وRender. اقرأ التعليق الأحدث بعنوان "authoritative Phase-1 handoff" في القضية الخاصة بك. أجرِ التحقق المباشر من تشغيلات schedule وSupabase SELECT عند الحاجة. كل ادعاء يوسم مؤكد/مستنتج/غير معروف. إن ثبت خلل، أنشئ فرعًا خاصًا وDraft PR واختبارات محلية بلا مزودي AI/بحث للتشخيص، مع CI وV3 Evals. لا تدمج أو تنشر أو تغيّر قاعدة الإنتاج أو الحد 3 أو سياسة المخاطر أو جدولة workflows أو الأسرار أو الأسعار أو تطبق الترحيل الأمني المعلّق. لا تعدل PROGRESS.md؛ أرسل حصيلتك وروابط PR وrun IDs ونتائج SQL إلى Issue الوكيل ثم إلى Issue #180. إن لم يوجد دليل، اكتب غير معروف ولا تصطنع تشغيلًا. المرحلة 2 ممنوعة حتى إغلاق المرحلة 1 وموافقة المالك.

For the coordinator, substitute Issue #180; the coordinator is authorized to read all four result threads and to update PROGRESS/evidence via a separate reviewable documentation PR only after revalidation.

## Evidence and integration contract

Each agent's final issue comment must have:
1. **Conversation URL** (only if the session actually exists), agent/task, verified `main` and Render SHA at observation.
2. **مؤكد** — exact GitHub run URL, event type `schedule`, commit, UTC and KSA clock, job RUN/SKIP and final result; for DB writes, SELECT-only aggregate, date/grain/row count; for no_change, precise logged reason.
3. **مستنتج** — hypotheses explicitly labeled with how to disprove.
4. **غير معروف** — what lacks evidence, where it can be collected and dependencies.
5. **Code outcome** — branch/draft PR, diff scope, CI/Evals/acceptance links, fail/rollback plan, and whether coordinator merge approval is required.
6. **Stage gate** — pass / blocked / needs verification, never a partial result framed as full success.

Agent 0 then independently reads the actual sources (not just worker prose) and updates the evidence matrix in #180 and `PROGRESS.md` only when backed by links. The coordinator may merge independently approved/test-only PRs under existing authorization and normal gates, but no changes to production publishing/security/schedules without a separately authorized decision. Final checkpoint **must** document W01 & W05 scheduled production success, read-only W01 publication provenance or its honest absence, independent QA, and no duplicate publication.

## Security and quota invariants

- `daily_limit=3`, `allow_high_risk` and current optional-source policy **unchanged**.
- No paid tools or AI/search provider calls purely for diagnosis; genuine scheduled production runs are distinct from tests.
- No live test publication, no Supabase schema migration or data deletion, no credentials/PII exposure.
- Keep any unrelated Phase 2–8 changes on hold. Phase 8 has a **30-day** independent monitoring prerequisite.
