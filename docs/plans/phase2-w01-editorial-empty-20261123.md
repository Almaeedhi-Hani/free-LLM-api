# W01 editorial stage — distinguish clean empty research from rejected proposals

**Date:** 2026-11-23 (KSA). **Stage 2 remains open.**

## Verified production incident

On the genuine [W01 schedule #45077365233](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/45077365233), research persisted 10 candidate sites / 13 confirmed existing keywords, 3 opportunities, 4 goals and 2 drafts. Every analyzed locale reported an output, but **the models proposed zero eligible editorial actions**; existing `stageEditorialActions` treated an empty array as `partial` and W01 ended failure even though the absence was not a rejected proposal. The current failure alert [#244](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/244) is correct for the deployed old code. The log does **not** establish a quota exhaustion, source fabrication, storage failure or validation policy defect.

## Limited change

- Add a strict, pure contract for **only** `editorial_actions`: a generated `[]` is `success_no_data` only if zero prior validation rejects, zero repairs, zero screened rejects and no editorial items to persist. Any invalid/rejected item or incomplete other stage remains `partial`/failure. No placeholder content is manufactured; editorial thresholds and review policy are untouched.
- Keep persistent GEO dashboard run status within its existing `success`/`partial` values; its detailed stage string discloses `editorial_actions:success_no_data`, and the sanitized artifact reports `no_data=true`. Do not invent a new production DB status enum.
- **Critical publishing safety:** a successful *research* cycle with `editorial_actions:success_no_data` is **not authorization to call W01 automatic publication**. The W01 workflow inspects the successfully persisted run artifact with the separate `publicationDecision` contract and exits **before** any publishing network request if no eligible editorial proposal exists. All missing/partial/invalid artifacts fail closed; ordinary fully successful cycles retain the same existing guarded endpoint and DB approval policy. Independent W03 publishing remains unchanged.
- Add real-function VM fixtures, contract tests, and a double CI gate (GEO static and admin regression). Tests check clean/no-data, invalid/rejected/repaired suggestions, valid proposals still persisted as `pending` with high risk, no fabricated records, and the W01 publisher skip.

## Release acceptance

Require complete PR checks, review of the scoped source diff, unchanged main head, production Render exact SHA and postmerge production/admin GET-only checks. Then the **next naturally scheduled** W01 run (not a synthetic dispatch) must independently show the appropriate outcome: either a fully valid editorial batch with unchanged publishing policy, or `success_no_data` with W01 publishing step explicitly skipped. If an upstream stage rejects data, continue reporting failure, not false success. Source-backed Supabase saved-row evidence remains necessary; do not close Issue #244 based on CI alone.

This change does not call providers, create content, change publisher policy, loosen the evidence guard, alter account quotas/permissions, run SQL, change cron cadence, or modify stage 3 Draft #242 and developed stage 4/5 Drafts #190/#195.
