# GEO Content & Impact Center: from review to guarded publication

## Phase 1: content inventory (PR #101)

- One authenticated admin tab lists editorial pages and proposed page changes, FAQ drafts, published FAQs, and technical tasks.
- Every row exposes provenance, locale (or **unknown** for legacy FAQs), status, dates when actually known, complete text, headings, evidence IDs, reviewed-source URLs and an actual published preview link where eligible.
- Pending proposals and rejected/archived proposals may be deleted after a double confirmation; published editorial content must be unpublished/archived before irreversible deletion. The existing optimistic-locking admin content API remains the only write mechanism.
- Page-level Google Search Console metrics use **only** saved `dimension=page` rows, never site-total rows or SEO guesses; missing pages show **unavailable**, not zero. FAQ-specific traffic and lead conversions remain **unknown** until an independently supported measurement integration is added.
- This release does not change public pages, prices, GSC schedules, SEO JSON-LD, database schema, or lead forms.

## Phase 2 development: explicitly opted-in sensitive automatic publishing

The owner approved including high/medium-risk investment and regulatory editorial **guides/comparisons** in unattended publishing. It is no longer a blanket human-only category, but it is **never enabled by default**.

- Global `enabled=false` and independent `allow_high_risk=false` are persisted in Supabase. The admin must explicitly confirm both permissions. Global daily cap 1–3, plus a hard limit of one sensitive item in the rolling 24-hour window.
- Sensitive candidates must have at least two explicit claim-to-source mappings `claim_evidence` (`claim`, `quote`, `url`) that occur within article body and on live official government HTML respectively. Two different government authorities are required, and every checked quotation must match the current page text. Failed fetch, missing quote, orphaned claim or non-government link blocks publication.
- The worker passes fresh verification proofs to an atomic service-role-only Supabase publication function; SQL rechecks saved source/claim relations and freshness, daily quota, route conflict, fingerprint idempotency, and records pre/post snapshots with risk level. The content is labeled as automatically checked rather than editor-reviewed.
- **Important limitation:** quote presence does not prove that a legal interpretation is accurate. The mechanism may miss implied or uncited assertions. Auto-published pages must identify the automated process and advise users to confirm current regulatory requirements with the agency. No promise of zero legal/commercial error.
- The 36 pre-existing high-risk proposals do not contain sufficient verified claim evidence. They remain pending and cannot be auto-published merely because a toggle was enabled. The generator/source-enrichment pipeline will need to produce grounded claim evidence for new high-risk proposals.
- Pricing pages, the home page, customer-facing packages, FAQ answers and technical SEO modifications remain outside the autonomous publish executor; this permission covers only approved routes for `guide` and `comparison` editorial pages.
- The existing weekly GEO job calls the publisher only after completing the GEO analysis stage successfully. No additional scheduled background run is added.

## Phase 2: future guarded automatic publication (NOT active in PR #101)

Automatic publication is part of the approved product direction. The policy foundation exists in `src/lib/content-impact.ts` but **no scheduled runner, endpoint or admin toggle invokes it yet**. A later rollout should provide:

1. A versioned publish candidate with a deterministic idempotency key (source record + language + target URL + normalized content digest), deduplication and an append-only revision/audit log.
2. Per-locale page allowlists, quota of at most 1–10 changes per day, preview, rollback, kill switch and strict separation of generated candidate vs. published version.
3. Mandatory real, independently checked official references for all claims, plus plagiarism/structural checks and published price/brand/route invariants. SEO tasks and internal links remain code-review changes, not visitor content.
4. **Sensitive investment and regulatory guidance may be automatically published only after independent owner opt-in and strict quote-to-claim checks against two distinct current official authority websites.** Merely labeling a source as official is insufficient. All unresolved content remains in pending review.
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

## Updated owner policy — source-flexible, unattended GEO publishing (18 Nov 2026)

The owner explicitly removed the two-government-source requirement and requested that
risk level alone never suppress or hide automatically generated content.

The live publishing pipeline now distinguishes **publication eligibility** from
**source verification**:
- Visitor-ready guides, comparisons, home/trust/service/package editorial blocks and
  completed Arabic FAQ drafts may publish automatically after the separately enabled
  automatic-publishing switches are on. Existing service offers and numeric package
  pricing stay in their original code-backed components and are not overwritten.
- One, two or **zero** government source links are acceptable; none is mandatory.
  Saved HTTPS research references may be displayed, but they are labeled
  **not independently verified**, and no schema citation claims verification.
- Low/medium/high risk levels stay visible and are recorded in publication history;
  a separate high-risk permission controls unattended sensitive material, already
  owner-authorized. This is an optional *permission*, not a two-source threshold.
- The SQL transaction enforces the 24-hour combined editorial+FAQ limit, prevents
  duplicate publication and conflicting article routes, snapshots before/after
  content, records source status, and preserves exact-version rollback.
- A lightweight daily GitHub Actions publisher attempts to publish queued items
  at 06:35 Saudi time without rerunning the paid/research GEO intelligence model.
  The existing weekly GEO pipeline also invokes the same publisher, with DB
  quota/locking to prevent double publication.
- Technical SEO and internal-link implementation tasks are not visitor pages.
  They remain visible as actionable admin tasks. Placeholder instructions such as
  "This page should explain..." are drafts to be finished rather than statements
  presented as factual public advice. No article is hidden for missing a citation.
- Public pages and FAQs identify automated and unverified material explicitly.
  Source absence is never rewritten into fabricated source references.

**Important:** source-flexible publishing cannot guarantee factual or legal
accuracy. Readers must confirm current legal, licensing, banking and investment
requirements directly with the responsible institutions. The automatic publisher
does not change the original service fee/pricing constants.

