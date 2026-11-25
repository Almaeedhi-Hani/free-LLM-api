# Two-stage public investor experience release

Phase 1: shared service hero for the five generic pages plus the existing specialist residency page; category-specific visual icon, localized summaries, early consultation, preparation, comparisons, native request wizard, reading experience, footer. All ten service fees and official disclosures remain from the existing catalog. Existing homepage buttons and navigation dimensions are untouched. Related services keep their routes.

Phase 2: language-specific advisor URLs with existing validated fallback; source hint for package request links (existing persisted attribution, not causality); request-scoped React cache avoids duplicate content reads in public server components without cross-request staleness. No new dependencies or external assets.

Optional measurement: first-party POST /api/investor-events accepts only closed event/page/locale values with fresh consent v2 and current admin analytics policy enabled. No visitor ID, IP field, URL, phone number, query string or input values in the event payload/log. Same-origin, 256-byte bound, capped per process, no third-party analytics. Refuse optional consent or revoke via footer privacy settings. Events are best-effort and visible as structured Render log lines (investor_signal); log retention applies, no durable aggregate database/dashboard and no unique visitor or causal funnel tracking. Persisted requests remain measured independently by the existing confirmed-leads path. Do not equate click counts with clients. Record measured performance from browser timings only; no guaranteed improvement. Existing dynamic content/metadata, schema, and SEO/GEO workflows remain unchanged.

Gate: all independent CI groups, 24 localized page SEO check, all six services and three locales in browser, comparison/wizard/assessment tests, consent reject/accept/revoke, responsive overflow and real navigation. No publication until exact head passes.

## Acceptance fixture correction
The initial localhost test returned 403 after consent. Set SITE_URL explicitly to the isolated test origin rather than weakening production origin or consent enforcement. Browser acceptance now additionally checks the stored consent and observes a real client page-view response, with the closed payload vocabulary. The production endpoint and privacy protections are unchanged.
