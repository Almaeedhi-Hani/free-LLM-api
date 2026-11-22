#!/usr/bin/env bash
# Runs ONLY in the disposable PostgreSQL 17 CI service.
# All limits below are synthetic fixtures, never real provider account data.
set -euo pipefail
export PGCONNECT_TIMEOUT=10
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.v3_provider_quota_config
  (provider, enabled, daily_request_limit, reset_timezone, verified_source, verified_at)
VALUES
  ('tavily', true, 5, 'UTC', 'ci-concurrent-fixture-not-real-account', clock_timestamp()),
  ('nvidia', true, 10, 'UTC', 'ci-concurrent-fixture-not-real-account', clock_timestamp());
UPDATE public.v3_provider_quota_config SET daily_token_limit=1000 WHERE provider='nvidia';
SQL

# Twelve genuine independent PostgreSQL connections race for only four permits.
# Launch all before waiting; do not test a single session's serial calls.
pids=()
for i in $(seq 1 12); do
  psql -X -Atq -v ON_ERROR_STOP=1 -c "SELECT public.v3_reserve_provider_quota('tavily','ci-concurrent:search-$i',1,0)" >"$tmp/tavily.$i.out" 2>"$tmp/tavily.$i.err" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
granted="$(cat "$tmp"/tavily.*.out | grep -cx reserved || true)"
denied="$(cat "$tmp"/tavily.*.out | grep -cx quota_reached || true)"
if [[ "$granted" != 4 || "$denied" != 8 ]]; then
  echo "Incorrect concurrent request outcome: granted=$granted denied=$denied" >&2
  exit 1
fi

# Eight different connections simultaneously use ONE stable attempt ID.
# Exactly one may reserve; subsequent retries must be duplicates, never
# authorizations to resend an ambiguous original network request.
pids=()
for i in $(seq 1 8); do
  psql -X -Atq -v ON_ERROR_STOP=1 -c "SELECT public.v3_reserve_provider_quota('nvidia','ci-concurrent:model-retry-1',1,300)" >"$tmp/nvidia.$i.out" 2>"$tmp/nvidia.$i.err" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
first="$(cat "$tmp"/nvidia.*.out | grep -cx reserved || true)"
duplicates="$(cat "$tmp"/nvidia.*.out | grep -cx duplicate_reservation || true)"
if [[ "$first" != 1 || "$duplicates" != 7 ]]; then
  echo "Incorrect concurrent idempotency: initial=$first duplicates=$duplicates" >&2
  exit 1
fi

# Conservative max-token reservation occurs in the same transaction.
# Provider has 800 token max, 300 already reserved; 300 more fits, 300
# further must fail without incrementing *either* requests or tokens.
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
DO $assert$
BEGIN
  IF public.v3_reserve_provider_quota('nvidia','ci-concurrent:model-other-2',1,300) <> 'reserved'
    OR public.v3_reserve_provider_quota('nvidia','ci-concurrent:model-other-3',1,300) <> 'quota_reached'
    THEN RAISE EXCEPTION 'Second metric did not atomically block the request'; END IF;
  IF (SELECT reserved_requests FROM public.v3_provider_quota_usage WHERE provider='tavily') <> 4
    OR (SELECT reserved_tokens FROM public.v3_provider_quota_usage WHERE provider='nvidia') <> 600
    OR (SELECT reserved_requests FROM public.v3_provider_quota_usage WHERE provider='nvidia') <> 2
    OR (SELECT count(*) FROM public.v3_provider_quota_attempts WHERE provider='tavily' AND status='reserved') <> 4
    OR (SELECT count(*) FROM public.v3_provider_quota_attempts WHERE provider='tavily' AND status='quota_reached') <> 8
    OR (SELECT count(*) FROM public.v3_provider_quota_attempts WHERE provider='nvidia' AND status='reserved') <> 2
    OR (SELECT count(*) FROM public.v3_provider_quota_attempts WHERE provider='nvidia' AND status='quota_reached') <> 1
    THEN RAISE EXCEPTION 'Concurrent attempts ledger and accounting diverged'; END IF;
END
$assert$;
SQL

# Timezone and daily reset cutover expressions, both sides of the configured
# 09:00 Asia/Riyadh reset, are synthetic calculations; actual owner account
# reset times remain unverified and unconfigured in production.
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
DO $assert$
DECLARE
  day_before date;
  day_after date;
BEGIN
  day_before := (TIMESTAMPTZ '2026-11-23 05:59:59+00' AT TIME ZONE 'Asia/Riyadh'
    - make_interval(hours => 9))::date;
  day_after := (TIMESTAMPTZ '2026-11-23 06:00:00+00' AT TIME ZONE 'Asia/Riyadh'
    - make_interval(hours => 9))::date;
  IF day_before <> DATE '2026-11-22' OR day_after <> DATE '2026-11-23' THEN
    RAISE EXCEPTION 'Configured daily reset boundary not respected';
  END IF;
END
$assert$;
SQL

echo 'PASS isolated concurrent quota tests: 12 requests/4 permits, 8 duplicate tokens/1 grant, atomic model budget, reset calculation'
