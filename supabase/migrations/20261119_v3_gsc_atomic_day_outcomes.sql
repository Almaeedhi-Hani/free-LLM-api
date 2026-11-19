-- V3 GSC atomic daily outcomes. PROPOSED only: do not apply to production without owner approval.
-- A separate service-role-only daily outcome is needed to tell successful zero-row
-- collections from failed attempts. Existing measured rows are never deleted.
CREATE TABLE IF NOT EXISTS public.gsc_sync_day_outcomes(
  property text NOT NULL,
  metric_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('success_with_data','success_no_data','failed')),
  checked_at timestamptz NOT NULL,
  rows_fetched integer NOT NULL CHECK (rows_fetched >= 0),
  attempts integer NOT NULL CHECK (attempts >= 1),
  PRIMARY KEY(property,metric_date),
  CHECK (
    (status='success_no_data' AND rows_fetched=0)
    OR (status='failed' AND rows_fetched=0)
    OR (status='success_with_data' AND rows_fetched>0)
  )
);
CREATE INDEX IF NOT EXISTS gsc_sync_day_outcomes_recent
  ON public.gsc_sync_day_outcomes(property, checked_at DESC);
ALTER TABLE public.gsc_sync_day_outcomes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gsc_sync_day_outcomes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.gsc_sync_day_outcomes TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.gsc_daily_metrics TO service_role;

-- Runs entirely as the service_role (security invoker), transactionally.
-- One RPC request = one transaction; any bad row or race rolls it all back.
CREATE OR REPLACE FUNCTION public.gsc_sync_commit_day(
 p_property text,p_date date,p_status text,p_checked_at timestamptz,
 p_attempts integer,p_rows jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 v_prior integer;
 v_row jsonb; v_dim text; v_key text;
 v_clicks bigint;v_impressions bigint;v_ctr double precision;v_position double precision;
 v_count integer:=0; v_seen text[]:=ARRAY[]::text[];
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'GSC service role required';
 END IF;
 IF p_property IS NULL OR length(p_property) NOT BETWEEN 12 AND 500
   OR p_date IS NULL OR p_status NOT IN ('success_with_data','success_no_data','failed')
   OR p_checked_at IS NULL OR p_attempts NOT BETWEEN 1 AND 1000
   OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array'
   OR jsonb_array_length(p_rows)>100000 THEN RAISE EXCEPTION 'Invalid GSC sync day'; END IF;
 IF p_date>current_date-2 OR p_checked_at>now()+interval '5 minutes' THEN
  RAISE EXCEPTION 'Future or incomplete GSC day'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_property||':'||p_date::text,0));
 SELECT attempts INTO v_prior FROM public.gsc_sync_day_outcomes
  WHERE property=p_property AND metric_date=p_date FOR UPDATE;
 IF p_attempts IS DISTINCT FROM coalesce(v_prior,0)+1 THEN
  RAISE EXCEPTION 'Stale GSC attempt'; END IF;
 IF p_status='failed' AND jsonb_array_length(p_rows)<>0 OR
    p_status='success_no_data' AND jsonb_array_length(p_rows)<>0 OR
    p_status='success_with_data' AND jsonb_array_length(p_rows)=0 THEN
  RAISE EXCEPTION 'GSC status does not match measurements'; END IF;
 FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  IF jsonb_typeof(v_row) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Invalid GSC row object'; END IF;
  v_dim:=v_row->>'dimension';v_key:=v_row->>'dimension_value';
  IF v_dim NOT IN ('total','query','page','country','device') OR
     v_dim IS NULL OR v_key IS NULL OR length(v_key)>2048 OR
     (v_dim='total' AND v_key<>'') OR
     (v_dim<>'total' AND length(v_key)=0) THEN
    RAISE EXCEPTION 'Invalid GSC grain'; END IF;
  IF (v_dim||':'||v_key)=ANY(v_seen) THEN
    RAISE EXCEPTION 'Duplicate GSC grain row'; END IF;
  v_seen:=array_append(v_seen,v_dim||':'||v_key);
  v_clicks:=(v_row->>'clicks')::bigint;
  v_impressions:=(v_row->>'impressions')::bigint;
  v_ctr:=(v_row->>'ctr')::double precision;
  v_position:=(v_row->>'position')::double precision;
  IF v_clicks IS NULL OR v_impressions IS NULL OR v_ctr IS NULL OR v_position IS NULL
     OR v_clicks<0 OR v_impressions<0 OR v_clicks>v_impressions
     OR v_ctr<0 OR v_ctr>1 OR v_position<0 THEN
    RAISE EXCEPTION 'Invalid GSC measurements'; END IF;
  INSERT INTO public.gsc_daily_metrics(
   property,metric_date,dimension,dimension_value,clicks,impressions,ctr,position,captured_at
  ) VALUES(
   p_property,p_date,v_dim,v_key,v_clicks,v_impressions,v_ctr,v_position,p_checked_at
  ) ON CONFLICT(property,metric_date,dimension,dimension_value) DO UPDATE SET
   clicks=EXCLUDED.clicks,impressions=EXCLUDED.impressions,
   ctr=EXCLUDED.ctr,position=EXCLUDED.position,captured_at=EXCLUDED.captured_at;
  v_count:=v_count+1;
 END LOOP;
 INSERT INTO public.gsc_sync_day_outcomes(property,metric_date,status,checked_at,rows_fetched,attempts)
 VALUES(p_property,p_date,p_status,p_checked_at,v_count,p_attempts)
 ON CONFLICT(property,metric_date) DO UPDATE SET
  status=EXCLUDED.status, checked_at=EXCLUDED.checked_at,
  rows_fetched=EXCLUDED.rows_fetched, attempts=EXCLUDED.attempts;
 RETURN jsonb_build_object('status',p_status,'stored',v_count,'attempts',p_attempts);
END;
$$;
REVOKE ALL ON FUNCTION public.gsc_sync_commit_day(text,date,text,timestamptz,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gsc_sync_commit_day(text,date,text,timestamptz,integer,jsonb) TO service_role;

-- Independent readback after commit, including exact stored measurements.
CREATE OR REPLACE FUNCTION public.gsc_sync_verify_day(
 p_property text,p_date date,p_expected_rows jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_status jsonb;v_matches integer;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'GSC service role required'; END IF;
 IF jsonb_typeof(p_expected_rows) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_expected_rows)>100000 THEN
  RAISE EXCEPTION 'Invalid expected GSC rows'; END IF;
 SELECT to_jsonb(o) INTO v_status FROM public.gsc_sync_day_outcomes o
  WHERE o.property=p_property AND o.metric_date=p_date;
 SELECT count(*) INTO v_matches
 FROM jsonb_to_recordset(p_expected_rows) AS x(
    dimension text,dimension_value text,clicks bigint,impressions bigint,
    ctr double precision,position double precision
 ) JOIN public.gsc_daily_metrics m ON
  m.property=p_property AND m.metric_date=p_date
  AND m.dimension=x.dimension AND m.dimension_value=x.dimension_value
  AND m.clicks=x.clicks AND m.impressions=x.impressions
  AND m.ctr=x.ctr AND m.position=x.position;
 RETURN jsonb_build_object('outcome',v_status,'matchingMeasurements',v_matches);
END;
$$;
REVOKE ALL ON FUNCTION public.gsc_sync_verify_day(text,date,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gsc_sync_verify_day(text,date,jsonb) TO service_role;
