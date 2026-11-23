# GSC service-account migration — Stage 2 acceptance (2026-11-23)
**Scope:** proposed code only; not production activated. Google Search Console service account was created and granted Restricted access by owner; Search Console API enabled. Owner reported a JSON secret file and `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gsc-service-account.json` prepared in Render. Connector has **not** verified saved secret contents; never display or commit credentials.

## Rollout gates
1. CI must pass including GSC offline signed JWT test, V3 Evals, admin regression and production read-only tests. Do not merge on green alone without owner checkpoint.
2. Verify `GSC_PROPERTY_URL` exactly matches the Search Console property that lists the service account. Property identity is independent of the OAuth project. Confirm service account still has sufficient read permissions.
3. Verify Render secret file name and path by presence only, never inspect or echo private-key content.
4. Change `GSC_AUTH_MODE` to `service_account` only after approval and main deployment; leave existing OAuth credentials intact as fallback. Code defaults to unchanged OAuth mode. No changes to quotas, cron, DB schema, RLS or publication policy.
5. Execute one authorized bounded GSC sync. Confirm real Google response, new `gsc_sync_day_outcomes` with persistence (if `GSC_BACKFILL_ENABLED`) or verified `gsc_daily_metrics` row/capture and API status; do not accept a green GitHub job alone. An empty real Google result needs an explicit honest outcome, not invented rows.
6. Check actual `event=schedule` independently and only close W04 incident after recovery evidence.
Rollback: unset `GSC_AUTH_MODE` (or set to `oauth`) to select existing refresh-token path. With old token already expired, rollback preserves old behavior but may not recover service; reauthorization is an alternate recovery path.

## Error/security constraints
- JWT assertion uses RS256, webmasters.readonly scope, fixed Google token endpoint, 60-minute expiry.
- Credentials remain in Render Secret Files; not returned in response, not copied into GitHub Actions.
- No real Google or Supabase calls in unit tests.
- GSC schema and publishing controls unchanged.
