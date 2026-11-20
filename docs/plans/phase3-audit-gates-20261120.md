# Invest in Saudi V3 — Phase 3 preliminary deterministic quality gates

Date: 2026-11-20. **Status: draft, audit-only; no production policy alteration.** The owner requested starting Phase 2 and Phase 3 in this conversation while Phase 4/5 UI work proceeds in another. This is the first safe Phase-3 slice. **Phase 3 cannot claim production completion before Phase-2 exit and a real acceptance cycle.**

## Included

- `scripts/v3-phase3-review-gates.cjs` evaluates proposed content, keywords, opportunity measurements, and AI evidence **without writing** the database or source. It has separate outcomes `pass_checks`, `reject`, `needs_review`; a `pass_checks` is explicitly NOT permission to publish.
- Reuses the already-present trilingual keyword policy `src/lib/keyword-relevance-eval.ts` via injected dependency, and competitor URL logic from `src/lib/source-policy.ts`. The admin CI test compiles those actual policy files; it does not replace official source checks with a mock policy.
- For content, requires existing server copy-quality validation as a dependency, verified competitor registry, stable item ID, recognized language (ar/en/zh), title and visitor copy, and duplicate fingerprint detection. Missing validators or registry cause `needs_review`; links to competitors in body, cited_sources, source_urls or sources lead to `needs_review`, not false citation claims.
- Root `AGENTS.md` qualified human review always takes priority for legal, regulatory, financial, residence, licensing and high-risk content. Even when a proposal passes deterministic preflight, the current production publishing workflow and owner risk/quotas stay unchanged. **Do not wire this prototype into publishing or automatically approve legal content.**
- `out_of_scope_review` keywords remain human-review candidates; rejected keywords appear in a `would_remove` report but **are not deleted**.
- Only dated verified-source opportunities may pass. A provider search ranking is never treated as Google organic rank.
- AI evidence remains explicitly labeled `model_only`, `search_grounded`, or `manual_ai_search`; model-only is never counted as verified AI search citation. Grounded citations still need human source verification.
- Offline regression suite checks policy semantics, language coverage, duplicate handling and no mutation; it is run in existing admin-regression CI.

## Not included yet / required acceptance gates

- [ ] Read-only audit of existing PR #142 competitor source filtering as rendered on real public pages, no competitor URLs and correct displayable government sources; never invent a new blacklist.
- [ ] Integration into approved existing FAQ/editorial review and exception queue without weakening the production quality or approval policy; explicit owner decision on any legal-approval policy conflict.
- [ ] Opportunity/goals storage and priority history readbacks with reversible decision reasons.
- [ ] Daily deduplicated GitHub technical issue handoff with real quotas.
- [ ] `geo_agent_feedback` suggestions: approval-only, no self-activation.
- [ ] Gemini AI measurement only under owner-approved free quota and clear evidence types.
- [ ] Weekly three-page qualified review **not activated** without separate owner approval.
- [ ] A real cycle that demonstrably accepts and rejects inputs, all CI/Evals/HTTP/browser gates green, and Phase-2 verified exit.

## Cross-conversation file ownership

This draft modifies only **new Phase-3 scripts, admin-regression test registration and this stage-specific note**. The Phase-2 branch owns its own safety scripts, workflows and report. The second conversation owns `src/app/admin/dashboard/page.tsx` and UI components for archive/published links. **Both Phase-2 and Phase-3 PRs currently modify `admin-regression.yml` and must be merged sequentially/rebased by the coordinator**, never overwrite a step from the other PR. No changes to `PROGRESS.md`, package prices, production DB schema, site text, cron schedule or quotas.


## Additional Phase 3.5/3.6 offline prototypes — no production activation

- `scripts/v3-phase3-technical-gates.cjs` previews a **maximum of 3 measured technical tasks per UTC day**, takes into account a caller-provided already-opened-today count, and de-duplicates a stable title+target fingerprint across days. It accepts only current `verified_serp` observations no older than 90 days, a safe internal route, and meaningful title; unverified provider-order suggestions stay in `review`. The preview **never creates GitHub Issues**. The real quota must eventually read actual issues and apply server-side idempotency before any write.
- `proposeFeedbackRule` never enables a model-learned rule. An actual rule PR is only `ready_for_separate_versioned_rule_pr` after weekly explicit owner approval, passing regression Evals, and reviewed real source evidence. Even then `enabled=false` until that separate reviewed code integration occurs. No silent keyword blacklisting.
- Both prototypes are tested in the existing required admin CI alongside Phase 3's trilingual source and content gates; the policy remains advisory-only while Stage 2 has not passed.
- **Still outstanding**: actual GitHub issue handoff, confirmed backed daily cap and dedup, applied rule PR with approval, separately evidenced AI measurement, and the owner-dependent weekly 3-page editorial review sampling.
