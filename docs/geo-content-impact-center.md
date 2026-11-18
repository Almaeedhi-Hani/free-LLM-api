# GEO Content & Impact Center: from review to guarded publication

## Phase 1: content inventory (PR #101)

- One authenticated admin tab lists editorial pages and proposed page changes, FAQ drafts, published FAQs, and technical tasks.
- Every row exposes provenance, locale (or **unknown** for legacy FAQs), status, dates when actually known, complete text, headings, evidence IDs, reviewed-source URLs and an actual published preview link where eligible.
- Pending proposals and rejected/archived proposals may be deleted after a double confirmation; published editorial content must be unpublished/archived before irreversible deletion. The existing optimistic-locking admin content API remains the only write mechanism.
- Page-level Google Search Console metrics use **only** saved `dimension=page` rows, never site-total rows or SEO guesses; missing pages show **unavailable**, not zero. FAQ-specific traffic and lead conversions remain **unknown** until an independently supported measurement integration is added.
- This release does not change public pages, prices, GSC schedules, SEO JSON-LD, database schema, or lead forms.

## Phase 2: future guarded automatic publication (NOT active in PR #101)

Automatic publication is part of the approved product direction. The policy foundation exists in `src/lib/content-impact.ts` but **no scheduled runner, endpoint or admin toggle invokes it yet**. A later rollout should provide:

1. A versioned publish candidate with a deterministic idempotency key (source record + language + target URL + normalized content digest), deduplication and an append-only revision/audit log.
2. Per-locale page allowlists, quota of at most 1–10 changes per day, preview, rollback, kill switch and strict separation of generated candidate vs. published version.
3. Mandatory real, independently checked official references for all claims, plus plagiarism/structural checks and published price/brand/route invariants. SEO tasks and internal links remain code-review changes, not visitor content.
4. **High/medium-risk investment, legal, government-fee or banking claims continue to require specialist approval.** Automatic publication must be limited to separately approved low-risk content classes until a stronger review protocol is proven; never silently promote AI-generated regulatory statements or competitor research to official facts.
5. Persist publication attribution `candidate_id`, `content_version`, `published_at`, `source_refs`, `rollback_version`, and the actual deployment/source URL.
6. Observe 7/28/90-day GSC clicks, impressions, CTR and weighted average position for a page, measured Google indexing and verified AI citation samples separately; use independently captured lead/conversion events. Never infer a conversion from a click or infer causation from a simple before/after correlation.

## Current operational baseline

- Post-PR100 GEO complete-run success is established; 36 editorial proposals remain pending specialist/source review.
- Existing stored GSC snapshots are **site-total-only** (three zero-total daily rows during November 2026). They cannot be attributed to individual articles. The new impact endpoint honestly returns `no_page_rows` until real page-level data is persisted.
- Existing GSC daily cron code can collect `page` rows but is not proof that the configured Google account is returning those rows.
- This PR is a content-management/measurement foundation; deployment and later automatic publication activation require separate, explicit validation gates.

## Acceptance and release checks

- `npm run test:impact` (inventory, preview routes, idempotency prerequisites, high-risk policy, GSC factual metrics, and UI contracts).
- Existing Admin, GSC, GEO and SQL CI suites plus Next.js production build.
- Verify admin route requires secret, no missing GSC data is shown as zero, and no automatic publishing mutation is available.
