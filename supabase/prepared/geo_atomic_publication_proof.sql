-- Prepared migration: apply only after isolated SQL CI and application contract review.
-- Existing publisher is paused; no schedule, data deletion, or policy activation.
-- The database checks the receipt and the entire locked JSONB snapshot.
-- Live source retrieval and semantic/translation assessment remain server responsibilities.
BEGIN;
CREATE OR REPLACE FUNCTION public.geo_publication_receipt_valid(
 p_item jsonb,p_expected jsonb,p_proofs jsonb,p_kind text,p_now timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $guard$
DECLARE v_meta jsonb; v_checked timestamptz; v_proof jsonb;
 v_fields text[]; v_claims text[]; v_host text; v_hosts text[]:='{}';
 v_seen text[]:='{}'; v_claim text; v_section jsonb; v_child jsonb; v_link jsonb;
BEGIN
 IF p_kind NOT IN ('faq','editorial') OR p_item IS NULL OR p_expected IS NULL OR
    p_item IS DISTINCT FROM p_expected OR p_item->>'status' IS DISTINCT FROM 'pending' OR
    p_item->>'risk_level' IS DISTINCT FROM 'low' THEN RETURN false; END IF;
 v_meta:=p_item->'review_preflight';
 IF v_meta->>'status' IS DISTINCT FROM 'ready' OR
    coalesce(v_meta->>'digest','') !~ '^[a-f0-9]{64}$' OR
    v_meta->>'archived'='true' THEN RETURN false; END IF;
 v_checked:=(v_meta->>'checked_at')::timestamptz;
 IF v_checked IS NULL OR v_checked>p_now OR v_checked<=p_now-interval '24 hours' THEN RETURN false; END IF;
 IF jsonb_typeof(p_proofs) IS DISTINCT FROM 'array' OR
    jsonb_typeof(p_item->'claim_evidence') IS DISTINCT FROM 'array' OR
    jsonb_typeof(p_item->'evidence_refs') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(p_proofs) NOT BETWEEN 2 AND 10 OR
    jsonb_array_length(p_proofs)<>jsonb_array_length(p_item->'claim_evidence') THEN RETURN false; END IF;
 IF p_kind='faq' THEN v_fields:=ARRAY[p_item->>'a'];
 ELSE
  v_fields:=ARRAY[p_item->>'title',p_item->>'summary',p_item->>'body',p_item->>'h1_suggestion'];
  FOR v_section IN SELECT value FROM jsonb_array_elements(coalesce(p_item->'sections','[]'::jsonb)) LOOP
   v_fields:=v_fields||ARRAY[v_section->>'h2',v_section->>'body'];
   FOR v_child IN SELECT value FROM jsonb_array_elements(coalesce(v_section->'subsections','[]'::jsonb)) LOOP
    v_fields:=v_fields||ARRAY[v_child->>'h3',v_child->>'body'];
   END LOOP;
  END LOOP;
  FOR v_link IN SELECT value FROM jsonb_array_elements(coalesce(p_item->'internal_links','[]'::jsonb)) LOOP
   v_fields:=v_fields||ARRAY[v_link->>'anchor'];
  END LOOP;
 END IF;
 -- Conservative regulated-copy guard, even if the model mislabeled risk.
 IF concat_ws(' ',p_item->>'q',p_item->>'primary_keyword',array_to_string(v_fields,' ')) ~*
 '(licen[sc]|legal|regulat|government fee|tax|ownership|shareholder|bank|residen|immigrat|visa|permit|approval|guarantee|cost estimate|paid service|service fee|sanction|penalt|موافقة|ترخيص|رخصة|نظام|قانون|رسوم|ضريبة|ملكية|إقامة|تأشيرة|بنك|مصرف|许可|执照|法律|税|收费|银行|居留|签证|股东|监管|审批)' THEN RETURN false; END IF;
 SELECT array_agg(DISTINCT normalized) INTO v_claims FROM (
  SELECT btrim(regexp_replace(normalize(part,NFC),'[[:space:]]+',' ','g')) normalized
  FROM unnest(v_fields) field
  CROSS JOIN LATERAL regexp_split_to_table(field,'[.!?]+([[:space:]]+|$)|[。！？؟]+[[:space:]]*|[\n\r]+') part
 ) s WHERE normalized<>'';
 IF coalesce(cardinality(v_claims),0)<>jsonb_array_length(p_proofs) OR
    v_meta->>'matched' IS DISTINCT FROM cardinality(v_claims)::text OR
    v_meta->>'total' IS DISTINCT FROM cardinality(v_claims)::text THEN RETURN false; END IF;
 FOR v_proof IN SELECT value FROM jsonb_array_elements(p_proofs) LOOP
  v_claim:=v_proof->>'claim';
  IF v_claim IS NULL OR length(v_claim) NOT BETWEEN 28 AND 450 OR
     NOT (v_claim=ANY(v_claims)) OR v_claim=ANY(v_seen) OR
     v_proof->>'quote' IS DISTINCT FROM v_claim OR
     v_proof->>'verified_by' IS DISTINCT FROM 'live_official_exact_quote' THEN RETURN false; END IF;
  v_checked:=(v_proof->>'checked_at')::timestamptz;
  IF v_checked IS NULL OR v_checked>p_now OR v_checked<=p_now-interval '15 minutes' THEN RETURN false; END IF;
  v_host:=substring(v_proof->>'url' from '^https://([a-z0-9.-]+)(/|$)');
  IF v_host IS NULL OR v_host NOT IN ('mc.gov.sa','misa.gov.sa','rulebook.sama.gov.sa','laws.boe.gov.sa','pr.gov.sa','cma.gov.sa') OR
     (v_proof->>'url') ~ '[@#]' THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_item->'claim_evidence') e
    WHERE e->>'claim'=v_claim AND e->>'quote'=v_claim AND e->>'url'=v_proof->>'url') OR
     NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_item->'evidence_refs') e
    WHERE e->>'kind' IN ('official_candidate','official-manual') AND e->>'url'=v_proof->>'url') THEN RETURN false; END IF;
  v_seen:=array_append(v_seen,v_claim);
  IF NOT (v_host=ANY(v_hosts)) THEN v_hosts:=array_append(v_hosts,v_host); END IF;
 END LOOP;
 RETURN cardinality(v_hosts)>=2;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$guard$;
REVOKE ALL ON FUNCTION public.geo_publication_receipt_valid(jsonb,jsonb,jsonb,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

-- Replace, not overload, the existing publication RPC signatures. RESTRICT is intentional.
DROP FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb) RESTRICT;
DROP FUNCTION public.geo_commit_auto_faq(text) RESTRICT;

CREATE OR REPLACE FUNCTION public.geo_commit_auto_publication(p_item_id text, p_verified_urls jsonb, p_claim_proofs jsonb, p_expected_item jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_enabled boolean; v_sensitive boolean; v_limit integer;
 v_now timestamptz := now(); v_content jsonb; v_array jsonb; v_item jsonb; v_new jsonb;
 v_index integer; v_n integer; v_risk text; v_kind text; v_lang text; v_target text;
 v_url jsonb; v_fingerprint text; v_id uuid;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN
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
 IF NOT public.geo_publication_receipt_valid(v_item,p_expected_item,p_claim_proofs,'editorial',v_now) THEN
  RETURN jsonb_build_object('status','version_or_evidence_not_verified'); END IF;
 IF p_verified_urls IS DISTINCT FROM (SELECT jsonb_agg(DISTINCT e->>'url' ORDER BY e->>'url') FROM jsonb_array_elements(p_claim_proofs) e) THEN
  RETURN jsonb_build_object('status','verified_source_mismatch'); END IF;
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
  'verified_sources',p_verified_urls,'cited_sources',p_verified_urls,
  'source_verification','independently_checked','approval_method','automated',
  'auto_published',true,'auto_published_at',v_now::text);
 UPDATE public.content_store SET content=pg_catalog.jsonb_set(
  v_content,ARRAY['editorialItems',v_index::text],v_new),updated_at=v_now WHERE id=1;
 INSERT INTO public.geo_publication_events(item_id,content_fingerprint,target_path,language,
  risk_level,before_item,after_item,source_urls,claim_proofs)
 VALUES(p_item_id,v_fingerprint,v_target,v_lang,v_risk,v_item,v_new,p_verified_urls,p_claim_proofs)
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('status','published','event_id',v_id,'target_path',v_target,
  'source_status','independently_checked');
END $function$;

CREATE OR REPLACE FUNCTION public.geo_commit_auto_faq(p_question text, p_expected_draft jsonb, p_claim_proofs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_now timestamptz := now();v_enabled boolean;v_sensitive boolean;v_limit integer;
 v_content jsonb;v_drafts jsonb;v_faqs jsonb;v_before jsonb;v_after jsonb;v_faq jsonb;
 v_index integer;v_fingerprint text;v_event uuid;v_count int;v_risk text;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN
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
 IF NOT public.geo_publication_receipt_valid(v_before,p_expected_draft,p_claim_proofs,'faq',v_now) THEN
  RETURN jsonb_build_object('status','version_or_evidence_not_verified'); END IF;
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
  'auto_published_at',v_now::text,'source_verification','independently_checked','publication_claim_proofs',p_claim_proofs);
 v_faq:=jsonb_build_object('q',v_before->>'q','a',v_before->>'a',
  'approval_method','automated','source_verification','independently_checked');
 UPDATE public.content_store SET content=pg_catalog.jsonb_set(
  pg_catalog.jsonb_set(v_content,'{drafts}',pg_catalog.jsonb_set(v_drafts,ARRAY[v_index::text],v_after)),
  '{faqs}',v_faqs||pg_catalog.jsonb_build_array(v_faq)),updated_at=v_now WHERE id=1;
 INSERT INTO public.geo_faq_publication_events(item_id,content_fingerprint,question,risk_level,
  before_draft,after_draft,published_faq)
 VALUES(p_question,v_fingerprint,p_question,v_risk,v_before,v_after,v_faq)
 RETURNING id INTO v_event;
 RETURN jsonb_build_object('status','published','event_id',v_event,'target_path','/',
  'source_status','independently_checked');
END $function$;
REVOKE ALL ON FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.geo_commit_auto_faq(text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.geo_commit_auto_faq(text,jsonb,jsonb) TO service_role;
COMMIT;
