-- STAGE 2.6 — PREPARED ONLY. DO NOT APPLY TO PRODUCTION WITHOUT OWNER APPROVAL.
-- Stored in docs/plans/security/, NOT a Supabase migration directory.
-- No account/provider limits are populated or guessed; default disabled.
-- SQL is tested against DISPOSABLE PostgreSQL 17 in CI only.
BEGIN;

CREATE TABLE public.v3_provider_quota_config (
  provider text PRIMARY KEY CHECK(provider IN
    ('exa','tavily','parallel','firecrawl','groq','gemini','nvidia','openrouter')),
  enabled boolean NOT NULL DEFAULT false,
  daily_request_limit bigint CHECK (daily_request_limit > 0),
  daily_token_limit bigint CHECK (daily_token_limit > 0),
  reset_timezone text,
  reset_hour smallint NOT NULL DEFAULT 0 CHECK (reset_hour BETWEEN 0 AND 23),
  reset_minute smallint NOT NULL DEFAULT 0 CHECK (reset_minute BETWEEN 0 AND 59),
  verified_source text,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp()
);
CREATE TABLE public.v3_provider_quota_usage (
  provider text NOT NULL REFERENCES public.v3_provider_quota_config(provider),
  window_date date NOT NULL,
  reserved_requests bigint NOT NULL DEFAULT 0 CHECK(reserved_requests >= 0),
  reserved_tokens bigint NOT NULL DEFAULT 0 CHECK(reserved_tokens >= 0),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
  PRIMARY KEY(provider, window_date)
);
CREATE TABLE public.v3_provider_quota_attempts (
  provider text NOT NULL REFERENCES public.v3_provider_quota_config(provider),
  attempt_key text NOT NULL CHECK (length(attempt_key) BETWEEN 8 AND 160
    AND attempt_key ~ '^[A-Za-z0-9:_-]+$'),
  window_date date NOT NULL,
  request_units bigint NOT NULL CHECK(request_units > 0),
  token_units bigint NOT NULL CHECK(token_units >= 0),
  status text NOT NULL CHECK(status IN ('reserved','quota_reached')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.transaction_timestamp(),
  -- Global per-provider idempotency, including across daily reset boundaries.
  PRIMARY KEY(provider, attempt_key)
);
CREATE INDEX v3_quota_attempts_by_window
  ON public.v3_provider_quota_attempts(provider, window_date, status);

-- All tables in public use RLS as a second layer; no user-facing policies.
ALTER TABLE public.v3_provider_quota_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_provider_quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_provider_quota_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.v3_provider_quota_config FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.v3_provider_quota_usage FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.v3_provider_quota_attempts FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.v3_reserve_provider_quota(
  p_provider text,
  p_attempt_key text,
  p_request_units bigint DEFAULT 1,
  p_token_units bigint DEFAULT 0
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  cfg public.v3_provider_quota_config%ROWTYPE;
  usage public.v3_provider_quota_usage%ROWTYPE;
  previous text;
  window_day date;
  request_cap numeric;
  token_cap numeric;
  now_at timestamptz := pg_catalog.transaction_timestamp();
  is_llm boolean;
BEGIN
  IF p_provider NOT IN ('exa','tavily','parallel','firecrawl','groq','gemini','nvidia','openrouter')
    OR p_provider IS NULL OR p_attempt_key IS NULL
    OR pg_catalog.length(p_attempt_key) NOT BETWEEN 8 AND 160
    OR p_attempt_key !~ '^[A-Za-z0-9:_-]+$'
    OR p_request_units IS NULL OR p_request_units < 1
    OR p_token_units IS NULL OR p_token_units < 0 THEN
    RETURN 'unconfigured';
  END IF;

  -- Serializes ALL reservations for a provider, including initial usage-row creation.
  -- Deliberately no optimistic unlocked "check then increment".
  SELECT * INTO cfg
    FROM public.v3_provider_quota_config WHERE provider = p_provider FOR UPDATE;
  IF NOT FOUND OR cfg.enabled IS DISTINCT FROM true
    OR cfg.daily_request_limit IS NULL
    OR cfg.verified_source IS NULL OR pg_catalog.length(pg_catalog.btrim(cfg.verified_source)) < 6
    OR cfg.verified_at IS NULL OR cfg.verified_at > now_at
    OR cfg.verified_at < now_at - interval '30 days'
    OR cfg.reset_timezone IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_timezone_names tz WHERE tz.name = cfg.reset_timezone
    ) THEN
    RETURN 'unconfigured';
  END IF;

  is_llm := p_provider IN ('groq','gemini','nvidia','openrouter');
  -- Model provider must reserve a conservative *maximum* token budget along
  -- with the request. Zero or unknown tokens fail closed.
  IF (is_llm AND (p_token_units < 1 OR cfg.daily_token_limit IS NULL))
    OR (NOT is_llm AND p_token_units <> 0) THEN
    RETURN 'unconfigured';
  END IF;
  -- Owner must verify account reset timezone + offset in addition to limits.
  window_day := (
    now_at AT TIME ZONE cfg.reset_timezone
    - pg_catalog.make_interval(hours => cfg.reset_hour, mins => cfg.reset_minute)
  )::date;
  SELECT status INTO previous FROM public.v3_provider_quota_attempts
    WHERE provider=p_provider AND attempt_key=p_attempt_key;
  IF FOUND THEN
    IF previous='reserved' THEN RETURN 'duplicate_reservation'; END IF;
    RETURN 'quota_reached';
  END IF;
  INSERT INTO public.v3_provider_quota_usage(provider,window_date)
    VALUES (p_provider,window_day)
    ON CONFLICT(provider,window_date) DO NOTHING;
  SELECT * INTO usage FROM public.v3_provider_quota_usage
    WHERE provider=p_provider AND window_date=window_day FOR UPDATE;

  request_cap := pg_catalog.floor(cfg.daily_request_limit::numeric * 0.80);
  token_cap := CASE WHEN cfg.daily_token_limit IS NOT NULL
    THEN pg_catalog.floor(cfg.daily_token_limit::numeric * 0.80) ELSE 0 END;
  IF usage.reserved_requests::numeric + p_request_units::numeric > request_cap
     OR (is_llm AND usage.reserved_tokens::numeric + p_token_units::numeric > token_cap) THEN
    INSERT INTO public.v3_provider_quota_attempts
      (provider,attempt_key,window_date,request_units,token_units,status)
      VALUES (p_provider,p_attempt_key,window_day,p_request_units,p_token_units,'quota_reached');
    RETURN 'quota_reached';
  END IF;

  UPDATE public.v3_provider_quota_usage
    SET reserved_requests=reserved_requests+p_request_units,
        reserved_tokens=reserved_tokens+p_token_units,
        updated_at=now_at
    WHERE provider=p_provider AND window_date=window_day;
  INSERT INTO public.v3_provider_quota_attempts
    (provider,attempt_key,window_date,request_units,token_units,status)
    VALUES (p_provider,p_attempt_key,window_day,p_request_units,p_token_units,'reserved');
  RETURN 'reserved';
END
$function$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; explicitly opt in only
-- the trusted server-side service_role after security review.
REVOKE ALL ON FUNCTION public.v3_reserve_provider_quota(text,text,bigint,bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.v3_reserve_provider_quota(text,text,bigint,bigint)
  TO service_role;
COMMIT;

-- No call sites are wired: even if this file is reviewed, it is NOT live
-- until owner-approved migration, verified true daily limits, reset rules,
-- per-provider tokens and all pre-outbound-call reservations are integrated.
