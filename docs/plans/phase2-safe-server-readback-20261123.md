# Stage 2 — protected server readback without sharing Supabase service_role with GitHub

Date: 2026-11-23 (KSA). **No database permission, RLS, schema or secret rotation is applied in this change.**

## Confirmed block

The real six-hour Watchdog [schedule #45061305520](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/45061305520) completed, and the Sunday [weekly Issue #230](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/230) was actually created. W01–W04 persistent-result and GSC measurements still appeared as `unknown`, because `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were missing in the GitHub Actions monitor context. This does not prove missing database credentials on the production website.

## Narrow existing-auth solution

- Add GET-only `/api/geo/monitor-readback?scope=watchdog|weekly`, explicitly protected by the **existing** `GEO_API_KEY` secret, constant-time compared. The quality-watch workflow already references `secrets.GEO_API_KEY`. Authentication is checked before any database request.
- The **existing Render server** is the only place that uses `getSupabaseCredentials()`; it performs fixed, bounded PostgREST GETs and responds with a minimal allowlisted aggregate: W01–W04 last saved timestamps, and for the Sunday report only GSC total-date/impressions/clicks, seven-day keyword-review counts and a verified own-domain page-day observation. It never returns underlying editorial text, customer data, full audit records or any database key.
- GitHub's safety monitor now uses one HTTPS GET to that exact hardcoded origin with `x-geo-api-key`, when its own database credentials are absent; the workflow **removes the old `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` bindings** and reuses `secrets.GEO_API_KEY`. It does not grant GitHub administration access or any new database privileges.
- Strict client validation requires exact `source=supabase`, matching scope, recent snapshot timestamp, source-attributed W03 audit table, valid GSC totals and safe own-site page path. Missing/invalid/unauthenticated responses become `unknown`, never fabricated success. Stale data still uses the existing independently timed Watchdog issue logic.
- All API responses specify `Cache-Control: no-store, private` and contain no secrets. Unsupported query scope returns 400; unauthorized/missing API key returns 401; missing server storage 503.

## Test/acceptance

- Offline Node regression tests include mocked HTTPS 200/401, stale/mismatched snapshots, W03 source validation, unsafe page rejection, a real weekly Issue-body fixture, and the original 2h/4h cadence and failure dedup.
- PR CI (TypeScript/Next.js build, security, V3 Evals, browser and production read-only checks) must all pass. Then merge this narrowly scoped patch, verify Render LIVE exact SHA and postmerge GET-only checks. Do not print keys in CI logs.
- **Still needed for Stage 2 exit:** a *genuine post-deploy scheduled* Watchdog and Sunday report where the previously unknown Supabase readback is now `observed` (or independently diagnosed as an API auth/config failure). If the existing GEO Actions secret itself is not configured, this implementation remains `unknown` and requires an owner-authorized secret-scoping fix. Never invent credentials.
- GSC's actual `google_token_400` OAuth incident [#237](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/237), future natural W05 schedule [#238](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/238), quality schedule, owner-safe Pause UI and verified per-provider daily 80%-quota ledger are separate open gates.

**Never silently modify** `daily_limit=3`, high-risk review policy, site publishing, paid/free provider calls, GitHub cron, RLS/role grants, or production database migrations.
