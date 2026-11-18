-- PR #103: owner-authorized automatic publication of all valid visitor-facing
-- GEO editorial categories, regardless of risk level or number of government sources.
-- Technical SEO/internal-link tasks cannot be represented as visitor-facing content.
-- This migration replaces ONLY the atomic publication RPC; prior schema and
-- audit, default off settings, idempotency and rollback remain unchanged.
CREATE OR REPLACE FUNCTION public.geo_commit_auto_publication(
 p_item_id text,p_verified_urls jsonb,p_claim_proofs jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_enabled boolean; v_allow_sensitive boolean; v_limit integer;
 v_content jsonb; v_items jsonb; v_item jsonb; v_next jsonb;
 v_index integer; v_count integer; v_now timestamptz:=now();
 v_kind text; v_lang text; v_risk text; v_target text; v_fingerprint text;
 v_url text; v_sources jsonb:='[]'::jsonb; v_event uuid;
BEGIN
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Forbidden';
 END IF;
 -- Locks serialize publisher instances and prevent quota races.
 SELECT enabled,allow_high_risk,daily_limit INTO v_enabled,v_allow_sensitive,v_limit
 FROM public.geo_publication_settings WHERE id=1 FOR UPDATE;
 IF NOT FOUND OR NOT v_enabled THEN RETURN jsonb_build_object('status','disabled'); END IF;
 IF v_limit NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'Invalid daily quota'; END IF;
 IF p_item_id IS NULL OR length(p_item_id) NOT BETWEEN 8 AND 128 THEN
  RAISE EXCEPTION 'Invalid item id';
 END IF;
 SELECT content INTO v_content FROM public.content_store WHERE id=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Content store unavailable'; END IF;
 v_items:=v_content->'editorialItems';
 IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Editorial inventory unavailable';
 END IF;
 SELECT elem.value,elem.ordinality::integer-1 INTO v_item,v_index
 FROM jsonb_array_elements(v_items) WITH ORDINALITY elem(value,ordinality)
 WHERE elem.value->>'id'=p_item_id LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 v_kind:=v_item->>'kind'; v_lang:=v_item->>'lang';
 v_risk:=COALESCE(v_item->>'risk_level','high');
 IF v_item->>'status'<>'pending' THEN RETURN jsonb_build_object('status','already_reviewed'); END IF;
 IF v_kind NOT IN ('home','trust','packages','service','guide','comparison') THEN
  RETURN jsonb_build_object('status','not_a_publishable_page');
 END IF;
 IF v_lang NOT IN ('ar','en','zh') OR v_risk NOT IN ('low','medium','high') THEN
  RETURN jsonb_build_object('status','invalid_editorial_metadata');
 END IF;
 IF v_risk<>'low' AND NOT COALESCE(v_allow_sensitive,false) THEN
  RETURN jsonb_build_object('status','sensitive_permission_disabled');
 END IF;
 IF length(COALESCE(v_item->>'title',''))<6 OR
    length(COALESCE(v_item->>'body',''))<80 THEN
  RETURN jsonb_build_object('status','invalid_page_copy');
 END IF;

 IF v_kind IN ('home','trust') THEN
  IF v_item->>'target'<>'/' THEN RETURN jsonb_build_object('status','invalid_route'); END IF;
  v_target:='/';
 ELSIF v_kind='packages' THEN
  IF v_item->>'target'<>'/packages' THEN RETURN jsonb_build_object('status','invalid_route'); END IF;
  v_target:='/packages';
 ELSIF v_kind='service' THEN
  IF v_item->>'target' NOT IN
   ('company-formation','misa-license','corporate-banking','contract-drafting',
    'premium-residency','investment-funds') THEN
   RETURN jsonb_build_object('status','invalid_route');
  END IF;
  v_target:='/services/'||v_item->>'target';
 ELSE
  IF v_item->>'slug' IS NULL OR length(v_item->>'slug')>90 OR
     v_item->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR
     v_item->>'target' IS DISTINCT FROM v_item->>'slug' THEN
   RETURN jsonb_build_object('status','invalid_route');
  END IF;
  v_target:='/insights/'||v_item->>'slug';
 END IF;
 IF v_lang<>'ar' THEN v_target:='/'||v_lang||v_target; END IF;

 -- Zero, one or many sources are allowed. A government-source count is NOT a
 -- publishing condition and source presence does not imply factual verification.
 IF p_verified_urls IS NOT NULL AND jsonb_typeof(p_verified_urls)<>'array' THEN
  RETURN jsonb_build_object('status','invalid_source_format');
 END IF;
 IF COALESCE(jsonb_array_length(p_verified_urls),0)>12 THEN
  RETURN jsonb_build_object('status','too_many_sources');
 END IF;
 FOR v_url IN SELECT jsonb_array_elements_text(COALESCE(p_verified_urls,'[]'::jsonb)) LOOP
  IF length(v_url)>1000 OR v_url !~* '^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(/|$)' OR
     v_url ~ '[@#[:space:]]' THEN
   RETURN jsonb_build_object('status','invalid_source_url');
  END IF;
  IF NOT (v_sources ? v_url) THEN v_sources:=v_sources||jsonb_build_array(v_url); END IF;
 END LOOP;

 SELECT count(*) INTO v_count FROM public.geo_publication_events
 WHERE published_at>v_now-interval '24 hours';
 IF v_count>=v_limit THEN RETURN jsonb_build_object('status','quota_reached'); END IF;
 -- Do not overwrite an existing guide/locale slug from another content id.
 IF v_kind IN ('guide','comparison') AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(v_items) e
   WHERE e->>'id'<>p_item_id AND e->>'status'='approved'
   AND e->>'lang'=v_lang AND e->>'kind' IN ('guide','comparison')
   AND e->>'slug'=v_item->>'slug'
 ) THEN RETURN jsonb_build_object('status','route_conflict'); END IF;

 v_fingerprint:=pg_catalog.md5(v_item::text);
 IF EXISTS(SELECT 1 FROM public.geo_publication_events
   WHERE item_id=p_item_id AND content_fingerprint=v_fingerprint) THEN
  RETURN jsonb_build_object('status','already_processed');
 END IF;
 v_next:=v_item||jsonb_build_object(
  'status','approved','reviewedAt',v_now::text,'updatedAt',v_now::text,
  'verified_sources',v_sources,'approval_method','automated',
  'auto_published',true,'auto_published_at',v_now::text,
  'source_verification_status','not_independently_verified'
 );
 UPDATE public.content_store SET
  content=pg_catalog.jsonb_set(v_content,ARRAY['editorialItems',v_index::text],v_next),
  updated_at=v_now WHERE id=1;
 INSERT INTO public.geo_publication_events(
  item_id,content_fingerprint,target_path,language,risk_level,before_item,after_item,
  source_urls,claim_proofs
 ) VALUES (p_item_id,v_fingerprint,v_target,v_lang,v_risk,v_item,v_next,v_sources,'[]'::jsonb)
 RETURNING id INTO v_event;
 RETURN jsonb_build_object('status','published','event_id',v_event,
  'target_path',v_target,'risk_level',v_risk,'source_count',jsonb_array_length(v_sources));
END $$;

REVOKE ALL ON FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb) TO service_role;
