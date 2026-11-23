# Stage 2 — automatic observation of existing provider usage (no manual ceiling guess)

## Owner direction
Monitor ordinary calls to Exa, Tavily, Parallel, Firecrawl, Groq, Gemini, NVIDIA and OpenRouter instead of making the owner type or invent plan caps. This implementation records only calls that were already going to run; it never probes a provider just to exhaust a limit.

## Live integration
- Shared Node module `src/lib/provider-usage-observer.cjs` captures response status, requests attempted, numeric token usage when returned, supported quota headers, and a bounded `Retry-After`. Never save API keys, prompts, query strings, response text, endpoint URLs, credit card data or user data.
- Existing W01 direct model and shared W01/W02 search adapters record sanitized observations through authenticated server-to-server `POST /api/geo/provider-usage` with existing GEO_API_KEY. The server writes to **existing Supabase audit_logs**, not a new table. A failed telemetry write does not retry third-party requests.
- `GET /api/geo/provider-usage` requires GEO_API_KEY, reads 7-day samples and publishes an 8-provider sanitized snapshot. Counts explicitly represent **observed attempts only** and are not assumed to be the complete account spend. Readback is capped at 1,000 rows; the response admits truncation.
- Before ordinary provider calls the adapters consult protected GET. If a recent 429/402 indicates a rate/credit problem, honor the provider's `Retry-After` or a **local protective pause** (15 minutes for HTTP 429 without retry, 24h for 402); avoid a request during the pause. No extra provider calls for discovery. A future successful response clears a stale 429.
- Only an explicitly known **daily** request ceiling enables advisory 80% blocking. Per Groq's current public documentation `x-ratelimit-limit-requests`/`x-ratelimit-remaining-requests` are **RPD**; `x-ratelimit-limit-tokens` is **TPM** and must NEVER be treated as a daily token budget. Other vendors' generic X-RateLimit-Limit is an unknown window. Unknown limits stay unknown. Reset fallback is local safety, not a claimed provider reset.
- Weekly Stage2 report now obtains provider observations through the same protected readback, lists counts, 429s, known header ceilings and unknowns, without running any provider.

## Not claimed / Stage2 remaining
- Ordinary requests and 429s **cannot reveal an undisclosed free-tier daily or monthly cap**, the full usage of other clients/API keys, or token reset policies. A 429 can be RPM/TPM/in-flight/credit exhaustion, NOT necessarily the daily cap.
- This best-effort telemetry is **not an atomic reservation guard** across simultaneous workflow workers. Full production guaranteed 80% enforcement for every provider still requires a trusted quota entitlement source, provider-specific billing/usage APIs when available, atomic reservations and security review. Existing provider-level per-run request ceilings and free-only endpoint allowlists stay unchanged. No paid model or automatic upgrade is authorized.
- No production RLS, DDL, new service-role secret, cron, publication policy or plugin installation is required. Never claim the Phase2 strict 80% atomic gate closed solely because observed requests are counted.
