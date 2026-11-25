-- Owner-enabled sensitive publishing with version-bound, routed exact proofs.
-- No replacement of content, table, policy, quota, role or rollback RPC.
BEGIN;
CREATE OR REPLACE FUNCTION public.geo_publication_receipt_valid(
 p_item jsonb,p_expected jsonb,p_proofs jsonb,p_kind text,p_now timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $guard$
DECLARE v_meta jsonb; v_checked timestamptz; v_proof jsonb;
 v_fields text[]; v_claims text[]; v_host text; v_hosts text[]:='{}';
 v_seen text[]:='{}'; v_claim text; v_section jsonb; v_child jsonb; v_link jsonb;
 v_v2 boolean; v_lane text; v_catalog boolean; v_catalog_count integer:=0; v_official_count integer:=0;
BEGIN
 IF p_kind NOT IN ('faq','editorial') OR p_item IS NULL OR p_expected IS NULL OR
    p_item IS DISTINCT FROM p_expected OR p_item->>'status' IS DISTINCT FROM 'pending' OR
    coalesce(p_item->>'risk_level','') NOT IN ('low','medium','high') THEN RETURN false; END IF;
 v_meta:=p_item->'review_preflight';
 v_v2:=coalesce(v_meta->>'evidence_lane_version','')='evidence-lanes-v2';
 v_lane:=v_meta->>'evidence_lane';
 IF NOT v_v2 AND p_item->>'risk_level'<>'low' THEN RETURN false; END IF;
 IF v_v2 AND (coalesce(v_lane,'') NOT IN ('commercial','mixed','regulatory','unknown') OR
  (v_lane IN ('mixed','regulatory') AND p_item->>'risk_level'<>'high') OR
  (v_lane='commercial' AND p_item->>'risk_level'<>'medium')) THEN RETURN false; END IF;
 IF v_meta->>'status' IS DISTINCT FROM 'ready' OR
    coalesce(v_meta->>'digest','') !~ '^[a-f0-9]{64}$' OR
    v_meta->>'archived'='true' THEN RETURN false; END IF;
 v_checked:=(v_meta->>'checked_at')::timestamptz;
 IF v_checked IS NULL OR v_checked>p_now OR v_checked<=p_now-interval '24 hours' THEN RETURN false; END IF;
 IF jsonb_typeof(p_proofs) IS DISTINCT FROM 'array' OR
    jsonb_typeof(p_item->'claim_evidence') IS DISTINCT FROM 'array' OR
    jsonb_typeof(p_item->'evidence_refs') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(p_proofs) NOT BETWEEN (CASE WHEN v_v2 THEN 1 ELSE 2 END) AND 10 OR
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
 IF p_item->>'risk_level'='low' AND concat_ws(' ',p_item->>'q',p_item->>'primary_keyword',array_to_string(v_fields,' ')) ~*
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
  v_catalog:=v_v2 AND v_proof->>'verified_by'='first_party_catalog_exact';
  IF v_claim IS NULL OR length(v_claim) NOT BETWEEN (CASE WHEN v_catalog THEN 6 ELSE 28 END) AND 450 OR
     NOT (v_claim=ANY(v_claims)) OR v_claim=ANY(v_seen) OR
     v_proof->>'quote' IS DISTINCT FROM v_claim OR
     (NOT v_catalog AND v_proof->>'verified_by' IS DISTINCT FROM 'live_official_exact_quote') THEN RETURN false; END IF;
  v_checked:=(v_proof->>'checked_at')::timestamptz;
  IF v_checked IS NULL OR v_checked>p_now OR v_checked<=p_now-interval '15 minutes' THEN RETURN false; END IF;
  v_host:=substring(v_proof->>'url' from '^https://([a-z0-9.-]+)(/|$)');
  IF v_catalog THEN
   IF v_lane NOT IN ('commercial','mixed') OR (v_proof->>'url') NOT IN
    ('https://free-llm-api-1-didl.onrender.com/packages','https://free-llm-api-1-didl.onrender.com/en/packages','https://free-llm-api-1-didl.onrender.com/zh/packages') OR
    (p_kind='editorial' AND (v_proof->>'url') IS DISTINCT FROM
     ('https://free-llm-api-1-didl.onrender.com'||CASE WHEN p_item->>'lang'='ar' THEN '' ELSE '/'||(p_item->>'lang') END||'/packages')) THEN RETURN false; END IF;
   v_catalog_count:=v_catalog_count+1;
  ELSE
   IF v_lane='commercial' AND v_v2 THEN RETURN false; END IF;
   IF v_host IS NULL OR v_host NOT IN ('mc.gov.sa','misa.gov.sa','rulebook.sama.gov.sa','laws.boe.gov.sa','pr.gov.sa','cma.gov.sa') OR
    (v_proof->>'url') ~ '[@#]' THEN RETURN false; END IF;
   v_official_count:=v_official_count+1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_item->'claim_evidence') e
    WHERE e->>'claim'=v_claim AND e->>'quote'=v_claim AND e->>'url'=v_proof->>'url') OR
     NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_item->'evidence_refs') e
    WHERE (CASE WHEN v_catalog THEN e->>'kind'='first_party_catalog' ELSE e->>'kind' IN ('official_candidate','official-manual') END)
      AND e->>'url'=v_proof->>'url') THEN RETURN false; END IF;
  v_seen:=array_append(v_seen,v_claim);
  IF NOT (v_host=ANY(v_hosts)) THEN v_hosts:=array_append(v_hosts,v_host); END IF;
 END LOOP;
 IF v_v2 THEN
  RETURN CASE WHEN v_lane='commercial' THEN v_catalog_count=cardinality(v_claims)
   WHEN v_lane IN ('regulatory','unknown') THEN v_official_count=cardinality(v_claims)
   ELSE v_catalog_count+v_official_count=cardinality(v_claims) END;
 END IF;
 RETURN cardinality(v_hosts)>=2;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$guard$;
REVOKE ALL ON FUNCTION public.geo_publication_receipt_valid(jsonb,jsonb,jsonb,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;


CREATE OR REPLACE FUNCTION public.geo_publication_contract_version() RETURNS text
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $version$
 SELECT 'routed-proof-v2'::text
$version$;
REVOKE ALL ON FUNCTION public.geo_publication_contract_version() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.geo_publication_contract_version() TO service_role;
COMMIT;
