\set ON_ERROR_STOP on
-- Disposable PostgreSQL CI database ONLY. This is not production deployment.
DO $roles$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$roles$;
\i docs/plans/security/phase2-provider-quota-atomic-ledger-proposal.sql

DO $assert$
BEGIN
  IF has_function_privilege('anon','public.v3_reserve_provider_quota(text,text,bigint,bigint)','EXECUTE')
    OR has_function_privilege('authenticated','public.v3_reserve_provider_quota(text,text,bigint,bigint)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.v3_reserve_provider_quota(text,text,bigint,bigint)','EXECUTE')
    THEN RAISE EXCEPTION 'Privileged function EXECUTE role isolation failed';
  END IF;
  IF has_table_privilege('anon','public.v3_provider_quota_usage','SELECT')
    OR has_table_privilege('authenticated','public.v3_provider_quota_attempts','SELECT')
    OR has_table_privilege('service_role','public.v3_provider_quota_config','SELECT')
    THEN RAISE EXCEPTION 'Direct quota table privilege exposed';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class WHERE relname LIKE 'v3_provider_quota_%'
    AND relkind='r' AND NOT relrowsecurity)
    THEN RAISE EXCEPTION 'Missing RLS on quota public table';
  END IF;
END
$assert$;

-- Defaults must be fail-closed: no guessed/provider free caps.
INSERT INTO public.v3_provider_quota_config(provider) VALUES ('exa');
DO $assert$
BEGIN
  IF public.v3_reserve_provider_quota('exa','run-001:search-1',1,0) <> 'unconfigured'
    THEN RAISE EXCEPTION 'Default disabled provider granted call';
  END IF;
  IF EXISTS(SELECT 1 FROM public.v3_provider_quota_attempts)
    THEN RAISE EXCEPTION 'Disabled provider mutated usage';
  END IF;
END
$assert$;

-- These caps are synthetic fixtures, NEVER production account limits.
UPDATE public.v3_provider_quota_config SET enabled=true,daily_request_limit=5,
  reset_timezone='UTC',verified_source='offline-fixture-not-real-account',
  verified_at=clock_timestamp()
  WHERE provider='exa';

DO $assert$
DECLARE i integer; outcome text;
BEGIN
  FOR i IN 1..4 LOOP
    outcome := public.v3_reserve_provider_quota('exa','run-001:search-'||i,1,0);
    IF outcome <> 'reserved' THEN RAISE EXCEPTION 'Expected reserve %, got %',i,outcome; END IF;
  END LOOP;
  IF public.v3_reserve_provider_quota('exa','run-001:search-5',1,0) <> 'quota_reached'
    THEN RAISE EXCEPTION 'More than 80%% request budget reserved'; END IF;
  IF public.v3_reserve_provider_quota('exa','run-001:search-1',1,0) <> 'duplicate_reservation'
    THEN RAISE EXCEPTION 'Original ambiguous network retry must not resend'; END IF;
  IF public.v3_reserve_provider_quota('exa','run-001:search-5',1,0) <> 'quota_reached'
    THEN RAISE EXCEPTION 'Denied attempt must remain denied'; END IF;
  IF public.v3_reserve_provider_quota('unknown','run-001:search-6',1,0) <> 'unconfigured'
    OR public.v3_reserve_provider_quota('exa','bad?',1,0) <> 'unconfigured'
    OR public.v3_reserve_provider_quota('exa','run-001:bad-tokens',1,300) <> 'unconfigured'
    THEN RAISE EXCEPTION 'Invalid provider/attempt/token unit fail-closed broken'; END IF;
  IF (SELECT reserved_requests FROM public.v3_provider_quota_usage WHERE provider='exa') <> 4
    THEN RAISE EXCEPTION 'Request ledger inaccurate'; END IF;
  IF (SELECT count(*) FROM public.v3_provider_quota_attempts WHERE provider='exa' AND status='reserved') <> 4
    OR (SELECT count(*) FROM public.v3_provider_quota_attempts WHERE provider='exa' AND status='quota_reached') <> 1
    THEN RAISE EXCEPTION 'Idempotent attempt ledger inaccurate'; END IF;
END
$assert$;

INSERT INTO public.v3_provider_quota_config
  (provider,enabled,daily_request_limit,daily_token_limit,reset_timezone,verified_source,verified_at)
VALUES ('groq',true,10,1000,'UTC','offline-fixture-not-real-account',clock_timestamp());
DO $assert$
BEGIN
  IF public.v3_reserve_provider_quota('groq','run-001:model-zero-tokens',1,0) <> 'unconfigured'
    THEN RAISE EXCEPTION 'Missing conservative LLM tokens permitted'; END IF;
  IF public.v3_reserve_provider_quota('groq','run-001:model-400',1,400) <> 'reserved'
    OR public.v3_reserve_provider_quota('groq','run-001:model-401',1,401) <> 'quota_reached'
    OR public.v3_reserve_provider_quota('groq','run-001:model-400b',1,400) <> 'reserved'
    OR public.v3_reserve_provider_quota('groq','run-001:model-1',1,1) <> 'quota_reached'
    THEN RAISE EXCEPTION 'Request and conservative token reservation not atomic'; END IF;
  IF (SELECT reserved_tokens FROM public.v3_provider_quota_usage WHERE provider='groq') <> 800
    OR (SELECT reserved_requests FROM public.v3_provider_quota_usage WHERE provider='groq') <> 2
    THEN RAISE EXCEPTION 'Atomic model metering inaccurate'; END IF;
END
$assert$;

UPDATE public.v3_provider_quota_config SET verified_at=clock_timestamp()-interval '31 days'
WHERE provider='exa';
DO $assert$
BEGIN
  IF public.v3_reserve_provider_quota('exa','run-002:stale-plan',1,0) <> 'unconfigured'
    THEN RAISE EXCEPTION 'Stale provider verification permitted'; END IF;
END
$assert$;

SET ROLE service_role;
DO $assert$
BEGIN
  IF public.v3_reserve_provider_quota('exa','run-002:service-role',1,0) <> 'unconfigured'
    THEN RAISE EXCEPTION 'Service role must obey verified plan'; END IF;
END
$assert$;
RESET ROLE;

SELECT 'PASS prepared 80-percent quota ledger: disabled defaults, RLS, 80% requests/tokens, atomic multi-meter accounting, idempotency, denied audit, service-role-only RPC' AS result;
