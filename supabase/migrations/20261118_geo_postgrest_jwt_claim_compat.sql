-- Supabase PostgREST sets request.jwt.claims JSON, not necessarily the deprecated
-- request.jwt.claim.role GUC. Support both while retaining service-role-only
-- GRANT EXECUTE, RLS and fail-closed checks in every publication/rollback RPC.
-- No changes to publication policy, quotas, existing rows or snapshots.

CREATE OR REPLACE FUNCTION public.geo_commit_auto_publication(
 p_item_id text, p_verified_urls jsonb, p_claim_proofs jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_enabled boolean; v_sensitive boolean; v_limit integer;
 v_now timestamptz := now(); v_content jsonb; v_array jsonb; v_item jsonb; v_new jsonb;
 v_index integer; v_n integer; v_risk text; v_kind text; v_lang text; v_target text;
 v_url jsonb; v_fingerprint text; v_id uuid;
BEGIN
 IF COALESCE(NULLIF(current_setting('request.jwt.claim.role',true),''),NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT enabled,allow_high_risk,daily_limit INTO v_enabled,v_sensitive,v_limit
  FROM public.geo_publication_settings WHERE id=1 FOR UPDATE;
 IF NOT FOUND OR NOT v_enabled THEN RETURN jsonb_build_object('status','disabled'); END IF;
 IF v_limit NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'Invalid daily limit'; END IF;
 IF p_item_id IS NULL OR length(p_item_id) NOT BETWEEN 8 AND 128 THEN
  RAISE EXCEPTION 'Invalid candidate ID'; END IF;
 IF jsonb_typeof(p_verified_urls) IS DISTINCT FROM 'array' OR
    jsonb_array_length(p_verified_urls)>12 THEN
  RAISE EXCEPTION 'Citations must be an optional array of at most 12 URLs'; END IF;
 IF jsonb_typeof(p_claim_proofs) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Claim provenance format invalid'; END IF;
 SELECT content INTO v_content FROM public.content_store WHERE id=1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Content store missing'; END IF;
 v_array:=v_content->'editorialItems';
 IF jsonb_typeof(v_array) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'No editorial inventory'; END IF;
 SELECT a.value, (a.ordinality::int-1) INTO v_item,v_index
 FROM jsonb_array_elements(v_array) WITH ORDINALITY a(value,ordinality)
 WHERE a.value->>'id'=p_item_id LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 v_risk:=v_item->>'risk_level';v_kind:=v_item->>'kind';v_lang:=v_item->>'lang';
 IF v_item->>'status'<>'pending' OR v_risk NOT IN ('low','medium','high') OR
    v_lang NOT IN ('ar','en','zh') THEN
  RETURN jsonb_build_object('status','invalid_state'); END IF;
 IF v_risk<>'low' AND NOT coalesce(v_sensitive,false) THEN
  RETURN jsonb_build_object('status','sensitive_publication_disabled'); END IF;
 -- Technical SEO/internal-link proposals are implementation tasks, not
 -- webpage copy; they remain visible in the admin task inventory.
 IF v_kind NOT IN ('guide','comparison','home','trust','service','packages') THEN
  RETURN jsonb_build_object('status','non_public_task'); END IF;
 IF length(coalesce(v_item->>'title',''))<6 OR
    length(coalesce(v_item->>'body',''))<80 OR
    jsonb_typeof(v_item->'evidence_ids') IS DISTINCT FROM 'array' OR
    jsonb_typeof(v_item->'evidence_refs') IS DISTINCT FROM 'array' THEN
  RETURN jsonb_build_object('status','incomplete_editorial_content'); END IF;
 FOR v_url IN SELECT value FROM jsonb_array_elements(p_verified_urls) LOOP
  IF jsonb_typeof(v_url) IS DISTINCT FROM 'string' OR
     length(v_url #>> '{}')>2000 OR
     (v_url #>> '{}') !~* '^https://[a-z0-9][-a-z0-9.]*[a-z0-9](/|$)' OR
     (v_url #>> '{}') ~ '[@#]' OR
     NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_item->'evidence_refs') e
      WHERE e->>'url'=(v_url #>> '{}')) THEN
   RAISE EXCEPTION 'Citation must be a safe stored HTTPS research reference'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_verified_urls))<>
   jsonb_array_length(p_verified_urls) THEN RAISE EXCEPTION 'Duplicate references'; END IF;

 IF v_kind IN ('guide','comparison') THEN
  IF coalesce(v_item->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR
     v_item->>'target' IS DISTINCT FROM v_item->>'slug' OR
     length(v_item->>'slug')>90 THEN RAISE EXCEPTION 'Invalid guide path'; END IF;
  v_target:='/insights/'||(v_item->>'slug');
 ELSIF v_kind='service' THEN
  IF v_item->>'target' NOT IN ('company-formation','misa-license','corporate-banking',
   'contract-drafting','premium-residency','investment-funds') THEN
   RAISE EXCEPTION 'Invalid service target'; END IF;
  v_target:='/services/'||(v_item->>'target');
 ELSIF v_kind='packages' THEN
  IF v_item->>'target'!='/packages' THEN RAISE EXCEPTION 'Invalid packages target'; END IF;
  v_target:='/packages';
 ELSE
  IF v_item->>'target'!='/' THEN RAISE EXCEPTION 'Invalid homepage target'; END IF;
  v_target:='/';
 END IF;
 IF v_lang<>'ar' THEN v_target:='/'||v_lang||v_target; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_array) other
  WHERE other->>'id'<>p_item_id AND other->>'status'='approved'
   AND other->>'lang'=v_lang AND other->>'kind'=v_kind
   AND other->>'target'=v_item->>'target' AND v_kind IN ('guide','comparison')) THEN
  RETURN jsonb_build_object('status','route_conflict'); END IF;
 SELECT (SELECT count(*) FROM public.geo_publication_events e
         WHERE e.published_at>v_now-interval '24 hours')+
        (SELECT count(*) FROM public.geo_faq_publication_events f
         WHERE f.published_at>v_now-interval '24 hours') INTO v_n;
 IF v_n >= v_limit THEN RETURN jsonb_build_object('status','quota_reached'); END IF;
 v_fingerprint:=pg_catalog.md5(v_item::text);
 IF EXISTS(SELECT 1 FROM public.geo_publication_events WHERE item_id=p_item_id
   AND content_fingerprint=v_fingerprint) THEN
  RETURN jsonb_build_object('status','already_processed'); END IF;
 v_new:=v_item||jsonb_build_object(
  'status','approved','reviewedAt',v_now::text,'updatedAt',v_now::text,
  'verified_sources','[]'::jsonb,'cited_sources',p_verified_urls,
  'source_verification','not_independently_checked','approval_method','automated',
  'auto_published',true,'auto_published_at',v_now::text);
 UPDATE public.content_store SET content=pg_catalog.jsonb_set(
  v_content,ARRAY['editorialItems',v_index::text],v_new),updated_at=v_now WHERE id=1;
 INSERT INTO public.geo_publication_events(item_id,content_fingerprint,target_path,language,
  risk_level,before_item,after_item,source_urls,claim_proofs)
 VALUES(p_item_id,v_fingerprint,v_target,v_lang,v_risk,v_item,v_new,p_verified_urls,p_claim_proofs)
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('status','published','event_id',v_id,'target_path',v_target,
  'source_status','not_independently_checked');
END $$;

CREATE OR REPLACE FUNCTION public.geo_commit_auto_faq(p_question text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_now timestamptz := now();v_enabled boolean;v_sensitive boolean;v_limit integer;
 v_content jsonb;v_drafts jsonb;v_faqs jsonb;v_before jsonb;v_after jsonb;v_faq jsonb;
 v_index integer;v_fingerprint text;v_event uuid;v_count int;v_risk text;
BEGIN
 IF COALESCE(NULLIF(current_setting('request.jwt.claim.role',true),''),NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT enabled,allow_high_risk,daily_limit INTO v_enabled,v_sensitive,v_limit
  FROM public.geo_publication_settings WHERE id=1 FOR UPDATE;
 IF NOT FOUND OR NOT v_enabled THEN RETURN jsonb_build_object('status','disabled'); END IF;
 IF p_question IS NULL OR length(p_question) NOT BETWEEN 5 AND 450 THEN
  RAISE EXCEPTION 'Invalid FAQ question'; END IF;
 SELECT content INTO v_content FROM public.content_store WHERE id=1 FOR UPDATE;
 v_faqs:=coalesce(v_content->'faqs','[]'::jsonb);
 v_drafts:=coalesce(v_content->'drafts','[]'::jsonb);
 IF jsonb_typeof(v_drafts)<>'array' OR jsonb_typeof(v_faqs)<>'array' THEN
  RAISE EXCEPTION 'Invalid FAQ store'; END IF;
 SELECT d.value,(d.ordinality::int-1) INTO v_before,v_index
  FROM jsonb_array_elements(v_drafts) WITH ORDINALITY d(value,ordinality)
  WHERE d.value->>'q'=p_question AND d.value->>'status'='pending' LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 v_risk:=coalesce(v_before->>'risk_level','high');
 IF v_risk NOT IN ('low','medium','high') THEN v_risk:='high'; END IF;
 IF v_risk<>'low' AND NOT coalesce(v_sensitive,false) THEN
  RETURN jsonb_build_object('status','sensitive_publication_disabled'); END IF;
 IF length(coalesce(v_before->>'a',''))<30 THEN
  RETURN jsonb_build_object('status','incomplete_faq'); END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_faqs) f
  WHERE pg_catalog.lower(pg_catalog.btrim(f->>'q'))=pg_catalog.lower(pg_catalog.btrim(p_question))) THEN
  RETURN jsonb_build_object('status','already_live'); END IF;
 SELECT (SELECT count(*) FROM public.geo_publication_events e
         WHERE e.published_at>v_now-interval '24 hours')+
        (SELECT count(*) FROM public.geo_faq_publication_events f
         WHERE f.published_at>v_now-interval '24 hours') INTO v_count;
 IF v_count>=v_limit THEN RETURN jsonb_build_object('status','quota_reached'); END IF;
 v_fingerprint:=pg_catalog.md5(v_before::text);
 IF EXISTS(SELECT 1 FROM public.geo_faq_publication_events
  WHERE item_id=p_question AND content_fingerprint=v_fingerprint) THEN
  RETURN jsonb_build_object('status','already_processed'); END IF;
 v_after:=v_before||jsonb_build_object('status','approved','approval_method','automated',
  'auto_published_at',v_now::text,'source_verification','not_independently_checked');
 v_faq:=jsonb_build_object('q',v_before->>'q','a',v_before->>'a',
  'approval_method','automated','source_verification','not_independently_checked');
 UPDATE public.content_store SET content=pg_catalog.jsonb_set(
  pg_catalog.jsonb_set(v_content,'{drafts}',pg_catalog.jsonb_set(v_drafts,ARRAY[v_index::text],v_after)),
  '{faqs}',v_faqs||pg_catalog.jsonb_build_array(v_faq)),updated_at=v_now WHERE id=1;
 INSERT INTO public.geo_faq_publication_events(item_id,content_fingerprint,question,risk_level,
  before_draft,after_draft,published_faq)
 VALUES(p_question,v_fingerprint,p_question,v_risk,v_before,v_after,v_faq)
 RETURNING id INTO v_event;
 RETURN jsonb_build_object('status','published','event_id',v_event,'target_path','/',
  'source_status','not_independently_checked');
END $$;

CREATE OR REPLACE FUNCTION public.geo_rollback_auto_faq(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_event public.geo_faq_publication_events%rowtype;v_content jsonb;
 v_faqs jsonb;v_drafts jsonb;v_draft jsonb;v_index integer;
BEGIN
 IF COALESCE(NULLIF(current_setting('request.jwt.claim.role',true),''),NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO v_event FROM public.geo_faq_publication_events WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 IF v_event.status<>'published' THEN RETURN jsonb_build_object('status','already_rolled_back'); END IF;
 SELECT content INTO v_content FROM public.content_store WHERE id=1 FOR UPDATE;
 v_faqs:=coalesce(v_content->'faqs','[]'::jsonb);
 v_drafts:=coalesce(v_content->'drafts','[]'::jsonb);
 SELECT d.value,(d.ordinality::int-1) INTO v_draft,v_index
  FROM jsonb_array_elements(v_drafts) WITH ORDINALITY d(value,ordinality)
  WHERE d.value->>'q'=v_event.question LIMIT 1;
 IF NOT FOUND OR v_draft IS DISTINCT FROM v_event.after_draft OR
    (SELECT count(*) FROM jsonb_array_elements(v_faqs) x
     WHERE x=v_event.published_faq)<>1 THEN
  RETURN jsonb_build_object('status','conflict'); END IF;
 UPDATE public.content_store SET content=pg_catalog.jsonb_set(
   pg_catalog.jsonb_set(v_content,'{drafts}',
    pg_catalog.jsonb_set(v_drafts,ARRAY[v_index::text],v_event.before_draft)),
   '{faqs}',(SELECT coalesce(jsonb_agg(value ORDER BY ordinality),'[]'::jsonb)
            FROM jsonb_array_elements(v_faqs) WITH ORDINALITY x(value,ordinality)
            WHERE value<>v_event.published_faq)), updated_at=now() WHERE id=1;
 UPDATE public.geo_faq_publication_events SET status='rolled_back',rolled_back_at=now()
 WHERE id=p_event_id;
 RETURN jsonb_build_object('status','rolled_back','event_id',p_event_id);
END $$;
REVOKE ALL ON FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.geo_commit_auto_faq(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.geo_rollback_auto_faq(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.geo_commit_auto_faq(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.geo_rollback_auto_faq(uuid) TO service_role;


-- The original editorial rollback RPC must use the same modern JWT claim format.
create or replace function public.geo_rollback_auto_publication(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_event public.geo_publication_events%rowtype;
  v_content jsonb;v_array jsonb;v_index integer;v_current jsonb;
begin
  IF COALESCE(NULLIF(current_setting('request.jwt.claim.role',true),''),NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role' THEN
    raise exception 'Forbidden';
  end if;
  select * into v_event from public.geo_publication_events
    where id=p_event_id for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if v_event.status<>'published' then return jsonb_build_object('status','already_rolled_back'); end if;
  select content into v_content from public.content_store where id=1 for update;
  v_array:=v_content->'editorialItems';
  select a.value,(a.ordinality::integer-1) into v_current,v_index
    from jsonb_array_elements(v_array) with ordinality a(value,ordinality)
    where a.value->>'id'=v_event.item_id limit 1;
  if not found or v_current is distinct from v_event.after_item then
    return jsonb_build_object('status','conflict','message','Published version has changed; manual review required');
  end if;
  update public.content_store set content=pg_catalog.jsonb_set(
    v_content,array['editorialItems',v_index::text],v_event.before_item),
    updated_at=now() where id=1;
  update public.geo_publication_events set status='rolled_back',rolled_back_at=now()
    where id=p_event_id;
  return jsonb_build_object('status','rolled_back','event_id',p_event_id,
    'target_path',v_event.target_path);
end $$;
REVOKE ALL ON FUNCTION public.geo_rollback_auto_publication(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.geo_rollback_auto_publication(uuid) TO service_role;
