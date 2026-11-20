# V3 Phase 2.6 — verified daily free-provider caps and atomic reservations (owner gate)

**Status: contract + safe offline tests only. NO LIVE ENFORCEMENT, NO PRODUCTION MIGRATION.**
Read-only Supabase verification on 2026-11-20 found **no public quota/provider-usage metering table** and no matching recorded provider-usage `audit_logs`. The GEO/search code has only per-run limits, which **cannot prove combined daily free-tier usage** across concurrent W01/W02 or retry attempts.

## Known provider identifiers, not guessed account limits

- Search/research: `exa`, `tavily`, `parallel`, `firecrawl`.
- Direct LLM research: `groq`, `gemini`, `nvidia`, `openrouter`.
- Exact accounts, model access and **current free-plan per-day requests/tokens** require checking the actual provider account dashboards or authoritative plan terms; a stored API key is not proof of a no-cost tier. No quotas were invented or enabled by this PR.

## Safe 80% policy contract

- `scripts/v3-provider-quota-contract.cjs` handles only offline validation of a proposed request: allowlist of provider and meter (`requests` or `tokens`), integer verified account limit, nonnegative usage, integer request size. Cap = **floor(0.80 × verified daily limit)**; a call crossing the cap is `quota_reached`. No rounding-up of a 1-request limit to 100%.
- A `reservation_eligible` local result has `granted:false` by design. The workflow **MUST NOT call a provider** based solely on this pure math. Actual grant requires a verified successful **atomic server-side DB reservation** with per-attempt idempotency and durable audit.
- Missing/expired verified account limit, unmetered token use or unsupported provider = `unconfigured`, never permission to send additional paid or unknown-tier calls. Preserve current provider order and provider-specific 429/402/403 errors.
- Use provider-specific daily reset/timezone only after actual plan verification. The test's UTC day is an **example**; do not silently attribute all accounts to UTC if their reset rules differ.

## Proposed additive database design (NOT APPLIED)

1. Owner-reviewed table `v3_provider_quota_settings`: provider, metric, daily_limit, reset timezone, source and checked_at, enabled. Defaults **disabled**; no real limits pre-populated.
2. `v3_provider_quota_usage`: provider, metric, quota_window_start, units_reserved, created_at / updated_at, unique(provider,metric,window).
3. `v3_provider_quota_reservations`: provider, metric, window, stable attempt key, units, status, created_at; unique reservation key to prevent retries overcounting.
4. Single carefully scoped `service_role` RPC with fixed search_path, revoked PUBLIC/anon/authenticated EXECUTE, and RLS; lock the provider's **quota-window usage row** before checking both verified limits and counting attempts. For models, the request and conservative maximum token reservation must be atomic **together** (avoid half reservations). Return statuses `reserved`, `quota_reached`, `unconfigured`, `duplicate_reservation`; duplicate is not approval to resend an ambiguous network call.
5. Non-refunded reservations for network-ambiguous outcomes to remain conservative. Keep aggregate metrics/reasons, never tokens/API secrets or user prompts. Denial must be visible as `quota_reached` in the Stage-2 weekly report.
6. Bind both search and GEO call sites before enabling enforcement; test concurrency in **disposable PostgreSQL 17**, month/day boundary and provider-specific resets, 80% cutoffs, failure modes, and real authorized monitor readback.

## What blocks activation

- Explicit owner approval for an additive schema migration, corresponding RLS/service-role grants, and validation against **their actual** free-plan daily limits for each provider.
- Need safe API integration for preflight reservations **before every outbound request**, including fallback probes and direct LLM calls; cannot count usage only after successful responses.
- Account-specific token budgets and daily reset windows must be evidenced before allowing paid-risk models. Unknown budgets remain blocked in enforcement mode.
- Run genuine W01/W02 scheduled cycles and read stored counters after deployment. No fabricated 80% coverage, quota_reached or zero-cost guarantee.

This document and pure contract **do not change** production DB, workflow cron, API behavior, free provider calls or currently configured publication limit of 3. Nothing here authorizes a migration to be run automatically. Phase 2 exit remains OPEN.
