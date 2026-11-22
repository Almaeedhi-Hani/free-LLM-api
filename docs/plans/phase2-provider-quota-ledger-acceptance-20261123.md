# Stage 2.6: owner-review-only atomic quota ledger

**Status: prepared and disposable-database-tested only. Do NOT deploy to production.**

This supplements Draft PR #199's existing pure 80% arithmetic contract. No actual provider account limit, free-tier entitlement, token rate or reset boundary is assumed. Phase 4 (#190) and Phase 5 (#195) are user-confirmed developed and their separate UI branches have not been changed.

## Architecture (off by default)

- An additive public-schema table `v3_provider_quota_config` with eight explicitly allowed providers. All config rows must be created by an owner-authorized administrative process, with genuine account-specific daily request limits, model token budgets, last-verification source/time, time zone and reset offset. The **default is disabled**, and there are no preloaded account limits.
- Atomic service-role-only RPC `v3_reserve_provider_quota` checks configuration freshness, then locks the provider config row `FOR UPDATE` across concurrent workflow jobs. Both request units and model's **maximum reserved tokens** are accounted in the same transaction. Budget caps use `floor(0.80 × verified daily limit)`. The model provider must specify positive token units; an unknown token limit denies the reservation.
- `v3_provider_quota_usage` records one provider-local window with reserved requests/tokens; `v3_provider_quota_attempts` stores a globally per-provider unique attempt key (even across day changes) and status `reserved` / `quota_reached`, to prevent network retries from generating new permission. `duplicate_reservation` is **not** permission to resend an ambiguous request.
- RLS is enabled on all three public tables; no user-facing policies, no direct table grants to anon/authenticated/service_role. SQL SECURITY DEFINER RPC uses empty search_path, explicit schema qualification, and revokes default PUBLIC EXECUTE, granting **only service_role**. Owner approval of the privileged function is still mandatory before any production deployment.

## Tests

`tests/sql/phase2-provider-quota-prepared.sql` creates only test roles in disposable PostgreSQL 17, exercises the **proposal SQL** and asserts:
- Disallowed anonymous/authenticated execute and direct table access, enabled RLS.
- Disabled by default, nonverified/stale limits and unsupported provider/invalid attempt fail closed.
- Request cap: synthetic daily 5 requests allows 4 reserves, rejects the fifth; repeated granted attempts never authorize a second call.
- Model cap: synthetic token daily 1000 allows 800 reserved tokens and denies request+token overages without half reservations.
- Attempts and aggregate counts match, with no API keys, customer data or provider network calls.

## Deployment block (important)

This SQL file is intentionally **not** in `supabase/migrations` and is **not** executed on production. Even a fully green CI proves only offline mechanics; it does not validate concurrency with real workload, reset policies on real provider accounts, network-ambiguous retries or operational outage handling. Before enabling anything the owner must (1) approve additive migration and exact RLS/RPC privileges, (2) provide verifiable free-plan account daily request/token limits and resets per provider, (3) implement preflight reservation at every W01/W02 provider attempt and fallback/retry path, (4) test same-provider concurrent reservations and calendar rollover in an isolated environment, (5) confirm read-only weekly counts and demonstrate natural scheduled cycles, and (6) approve rollback/monitoring and owner-controlled pause.

No schema, secrets, production provider calls, publication limit `daily_limit=3`, workflows/schedules, admin UI or Stage 4/5 changes take effect by merging this documentation and CI-only proposal. Stage 2 and Stage 3 remain open, and Stage 4/5 remain staged.
