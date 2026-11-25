DO $quota$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef('public.geo_commit_auto_publication(text,jsonb,jsonb)'::regprocedure) INTO v_def;
 IF strpos(v_def,'IF v_limit NOT BETWEEN 1 AND 3 THEN')=0 THEN
  RAISE EXCEPTION 'Unexpected editorial RPC definition; no quota change';
 END IF;
 EXECUTE replace(v_def,'IF v_limit NOT BETWEEN 1 AND 3 THEN','IF v_limit NOT BETWEEN 1 AND 10 THEN');
 SELECT pg_get_functiondef('public.geo_commit_auto_faq(text)'::regprocedure) INTO v_def;
 IF strpos(v_def,'IF NOT FOUND OR NOT v_enabled THEN RETURN jsonb_build_object(''status'',''disabled''); END IF;')=0 THEN
  RAISE EXCEPTION 'Unexpected FAQ RPC definition; no quota change';
 END IF;
 EXECUTE replace(v_def,'IF NOT FOUND OR NOT v_enabled THEN RETURN jsonb_build_object(''status'',''disabled''); END IF;',
  'IF NOT FOUND OR NOT v_enabled THEN RETURN jsonb_build_object(''status'',''disabled''); END IF; IF v_limit NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION ''Invalid daily limit''; END IF;');
 UPDATE public.geo_publication_settings SET daily_limit=10,updated_at=now() WHERE id=1 AND daily_limit=3 AND enabled=true AND allow_high_risk=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'Publication policy changed concurrently; no quota change'; END IF;
END $quota$;
