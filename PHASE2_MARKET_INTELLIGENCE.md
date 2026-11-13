# Phase 2 — Market & Competitor Intelligence (Design & Local Implementation)

Status: Implemented locally only. Migration 003 NOT applied. No GitHub push, no Render deploy.

## 1. Scope (per GEO_INTELLIGENCE_SPEC.md Phase 2)
1. Competitor radar: discovery + analysis in ar/en/zh.
2. Keyword/question/intent collection from trusted sources.
3. Competitor gap discovery and high-value commercial opportunities (no copying).
4. Prioritized automatic goals with evidence, confidence, and success metrics.
5. Admin dashboard sections: competitors, keywords, opportunities, goals, analysis runs.
6. Persistence + history in Supabase (service_role only) with permission/repetition/failure tests.
7. Periodic operation design with request/cost limits.

## 2. Data model (Migration 003, NOT applied)
New tables (all RLS-enabled, service_role only, anon/authenticated revoked):
- competitors (id, name, domain unique, languages[], market, status, source, notes, first/last_seen_at, created/updated_at)
- competitor_observations (competitor_id FK cascade, observed_at, language, query, rank, title, snippet, url, page_type, strengths[], weaknesses[], raw, unique(competitor_id, observed_at, language, query))
- keywords (term, language, intent, cluster, source, search_volume nullable, volume_source, volume_confidence, first/last_seen_at, unique(term, language), volume requires source)
- opportunities (title, type, priority, score 0-100, evidence jsonb, languages[], related_keywords[], related_competitors[], status, confidence, estimated_impact, unique(title, type))
- agent_goals (title, description, priority, status, evidence, success_metrics, confidence, related_opportunity_id FK, completed_at, unique(title, related_opportunity_id))
- analysis_runs (run_type, started/finished_at, status, summary, error, triggered_by)

Indexes, updated_at triggers (reusing geo_set_updated_at), constraints, and verification SQL are provided.

## 3. Intelligence pipeline (deterministic, no external data)
- normalizeDomain: canonical domain extraction.
- detectLanguage: ar/en/zh heuristic.
- classifyIntent: informational/transactional/commercial/navigational.
- scoreOpportunity: bounded 0-100 from evidence count, languages, confidence, type (no fabricated volumes).
- priorityFromScore: critical/high/medium/low.
- prioritizeGoals: sort by priority then confidence.
- runMarketAnalysis: bounded (max 50 competitors, 200 keywords). Creates opportunities + goals from existing observations/keywords. Idempotent via unique constraints.

No competitor content is copied; only metadata, snippets, and evidence references are stored.

## 4. Storage & permissions
- Reuses storage-mode.ts (fail-closed, build-phase allowance).
- market-intelligence.ts supports file mode (dev/tests/build) and Supabase mode.
- All new tables: RLS enabled, service_role only, anon/authenticated revoked (migration).

## 5. API (admin-protected, force-dynamic)
- GET/POST /api/admin/market/competitors
- PATCH /api/admin/market/competitors
- GET/POST /api/admin/market/keywords
- GET/POST /api/admin/market/opportunities
- PATCH /api/admin/market/opportunities
- GET/POST /api/admin/market/goals
- PATCH /api/admin/market/goals
- GET/POST /api/admin/market/runs
- PATCH /api/admin/market/runs
- POST /api/admin/market/analyze (bounded analysis)
- GET /api/cron-market (cron, CRON_SECRET)

Auth: x-admin-secret matching ADMIN_SECRET/CRON_SECRET/REVALIDATION_SECRET.

## 6. Admin dashboard
New tabs: Competitors, Keywords, Opportunities, Goals, Analysis Runs.
- Add competitor/keyword forms.
- Run Analysis button.
- Status dropdowns for opportunities/goals.
- Runs table.

## 7. Periodic operation (design)
- GitHub Actions: .github/workflows/market-radar.yml (daily 02:00 UTC) calls /api/cron-market.
- Rate limits: 50 competitors, 200 keywords, 20 observations per competitor per run.
- No paid API calls in v1 (deterministic over ingested data).
- External data collection (Phase 2.1) requires API keys + ToS review (see section 8).

## 8. External requirements (not yet configured)
- Supabase: apply migration 003 (service_role access) — requires approval.
- Data sources (optional, for real ingestion): Google Custom Search API + CSE ID, or SerpAPI/Bing Web Search; Chinese sources (Baidu/Zhihu) may need custom scrapers; official Saudi sources (MISA, SAMA, CMA) for verified claims.
- GitHub Actions secrets: CRON_SECRET (already present), optionally SEARCH_API_KEY.
- Render: env already has Supabase + CRON_SECRET.

## 9. No fabricated metrics policy
- search_volume is nullable and only stored with volume_source.
- score is computed deterministically from observed evidence.
- estimated_impact is qualitative.
- No synthetic competitor data is seeded in production.

## 10. Tests
- scripts/market-intelligence.test.cjs: 23 tests (helpers, CRUD, idempotency, filters, failure modes, Supabase mock path) — PASS.
- npm run test:market.
- supabase/verify/003_preflight.sql and 003_market_intelligence.sql (not run; migration not applied).

## 11. Files added/modified (local only)
- supabase/migrations/003_phase2_market_intelligence.sql
- src/lib/market-intelligence.ts
- src/lib/market-sources.ts
- src/app/api/admin/market/{competitors,keywords,opportunities,goals,runs,analyze,radar}/route.ts
- src/app/api/cron-market/route.ts
- src/app/api/cron-market/route.ts
- src/app/admin/dashboard/page.tsx
- scripts/market-intelligence.test.cjs
- .github/workflows/market-radar.yml
- supabase/verify/003_preflight.sql
- supabase/verify/003_market_intelligence.sql
- PHASE2_MARKET_INTELLIGENCE.md
- package.json (test:market script)

## 11.5 Phase 2B — Real Market Intelligence (added)
- src/lib/market-sources.ts: free source adapters (Google Suggest, DuckDuckGo Suggest) + key-gated Bing Web Search.
- runDiscovery / runRadar in market-intelligence.ts: collects new data (keywords, competitors, observations) then runs analysis.
- Provenance: keywords store source; observations store url/snippet/rank/raw; volumes remain null unless a named source exists.
- Distinguishes observed (source-backed) vs estimated (score/priority) vs inferred (gaps/opportunities).
- /api/admin/market/radar (manual) and /api/cron-market (cron) collect new data; market-radar.yml updated.
- Tests: 37 total (added source failure, repetition, limits, empty-data, idempotency, Bing mock + evidence).
- No fabricated competitors/volumes; Bing requires BING_SEARCH_API_KEY (optional, free tier requires approval).

## 11.6 Phase 2C — Competitor discovery (design)
See `PHASE2C_COMPETITOR_DISCOVERY.md` for provider comparison, cost analysis, competitor extraction design, origin tracking, keyword clustering, and approval requirements.

## 12. Next steps (require approval)
1. Review migration 003 and verification SQL.
2. Apply migration 003 to Supabase (preflight first).
3. Configure external search API keys (optional).
4. Push commits and deploy Render.
5. Run production integrity tests for new endpoints.
