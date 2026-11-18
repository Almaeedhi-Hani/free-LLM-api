## Current owner-approved automatic publishing policy — supersedes prior source-count rules

The owner explicitly requested automatic publication without excluding editorial content for being legally/financially sensitive, and **without a mandatory government source count**. The previous two-government-domain/claim-quotation threshold is therefore **not used as an eligibility gate**. Source URLs, when available, are displayed as citations without a claim that they were independently fact-checked. Unsourced pages are visibly labeled as automatically published and unverified. This is a conscious reduction in source assurance and can expose visitors to inaccurate advice.

- The database settings `enabled=true` and `allow_high_risk=true` authorize unattended content updates. A daily quota (1–3 per rolling 24 hours) prevents an unintended mass change; it limits the rate, **not eligibility by subject or evidence count**.
- Visitor-facing GEO editorial kinds `home`, `trust`, `packages`, `service`, `guide` and `comparison` may be published when their stored structure and route are valid. The operator's static package prices are not modified by this content publisher.
- Technical SEO/internal-link instructions are software-development work items, not visitor-facing articles. Publishing these as text would corrupt public pages; a separate change executor would be needed to implement them as code.
- Publishing is an atomic database transaction with an audit snapshot, last-version rollback, idempotent content fingerprint, protected routes and the configured daily quota. Previously approved content is not overwritten without a recorded revision.
- Daily automatic publishing runs separately from the weekly GEO discovery analysis, and can publish a pending backlog over successive days.
- This policy **does not assert source verification or legal accuracy**. The public page must clearly identify itself as automatically published and not independently checked. Source links are optional and should not be described as verified merely because the domains respond.

Earlier notes below describe the historical gated design and are superseded by this section wherever they conflict.

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
