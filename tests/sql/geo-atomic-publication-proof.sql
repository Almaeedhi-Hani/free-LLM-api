\set ON_ERROR_STOP on
-- Isolated PostgreSQL only; never run against production.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE TABLE public.content_store(id integer PRIMARY KEY,content jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.geo_publication_settings(id integer PRIMARY KEY,enabled boolean NOT NULL,allow_high_risk boolean NOT NULL,daily_limit integer NOT NULL);
CREATE TABLE public.geo_publication_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),item_id text,content_fingerprint text,target_path text,language text,risk_level text,before_item jsonb,after_item jsonb,source_urls jsonb,claim_proofs jsonb,published_at timestamptz DEFAULT now(),status text DEFAULT 'published');
CREATE TABLE public.geo_faq_publication_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),item_id text,content_fingerprint text,question text,risk_level text,before_draft jsonb,after_draft jsonb,published_faq jsonb,published_at timestamptz DEFAULT now(),status text DEFAULT 'published');
CREATE FUNCTION public.geo_commit_auto_publication(text,jsonb,jsonb) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.geo_commit_auto_faq(text) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
\ir ../../supabase/prepared/geo_atomic_publication_proof.sql
DO $$ BEGIN
 IF has_function_privilege('anon','public.geo_publication_contract_version()','EXECUTE') OR
 has_function_privilege('authenticated','public.geo_publication_contract_version()','EXECUTE') OR
 NOT has_function_privilege('service_role','public.geo_publication_contract_version()','EXECUTE') OR
 public.geo_publication_contract_version() IS DISTINCT FROM 'exact-proof-v1'
 THEN RAISE EXCEPTION 'contract handshake ACL or version mismatch'; END IF;
END $$;
INSERT INTO public.geo_publication_settings VALUES(1,false,false,10);
CREATE TEMP TABLE proof_fixture(kind text,item jsonb,proofs jsonb,urls jsonb);
INSERT INTO proof_fixture
SELECT 'faq',jsonb_build_object('q','How can a visitor organize research notes?','a',a||'. '||b||'.','status','pending','risk_level','low',
 'review_preflight',jsonb_build_object('status','ready','digest',repeat('a',64),'checked_at',now(),'matched',2,'total',2),
 'claim_evidence',jsonb_build_array(jsonb_build_object('claim',a,'quote',a,'url',u),jsonb_build_object('claim',b,'quote',b,'url',v)),
 'evidence_refs',jsonb_build_array(jsonb_build_object('kind','official_candidate','url',u),jsonb_build_object('kind','official_candidate','url',v))),
 jsonb_build_array(jsonb_build_object('claim',a,'quote',a,'url',u,'checked_at',now(),'verified_by','live_official_exact_quote'),jsonb_build_object('claim',b,'quote',b,'url',v,'checked_at',now(),'verified_by','live_official_exact_quote')),
 jsonb_build_array(u,v)
FROM (VALUES('Visitors can organize their research notes by topic','Visitors can compare written information before choosing a next step','https://mc.gov.sa/fixture','https://misa.gov.sa/fixture')) s(a,b,u,v);
INSERT INTO proof_fixture
SELECT 'editorial',(item-'q'-'a')||jsonb_build_object('id','ed-fixture-12345','kind','guide','lang','en','target','fixture-guide','slug','fixture-guide','title',item->'claim_evidence'->0->>'claim','summary',item->'claim_evidence'->1->>'claim','body',repeat(item->'claim_evidence'->0->>'claim'||'. ',3),'evidence_ids',jsonb_build_array('fixture1','fixture2')),proofs,urls
FROM proof_fixture WHERE kind='faq';
INSERT INTO public.content_store(id,content) SELECT 1,jsonb_build_object('drafts',jsonb_build_array((SELECT item FROM proof_fixture WHERE kind='faq')),'editorialItems',jsonb_build_array((SELECT item FROM proof_fixture WHERE kind='editorial')),'faqs','[]'::jsonb);
GRANT SELECT ON proof_fixture TO service_role;
DO $$ BEGIN
 IF to_regprocedure('public.geo_commit_auto_faq(text)') IS NOT NULL OR to_regprocedure('public.geo_commit_auto_publication(text,jsonb,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'legacy RPC survived'; END IF;
 IF has_function_privilege('anon','public.geo_commit_auto_faq(text,jsonb,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.geo_commit_auto_publication(text,jsonb,jsonb,jsonb)','EXECUTE') OR has_function_privilege('service_role','public.geo_publication_receipt_valid(jsonb,jsonb,jsonb,text,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'unexpected RPC permission'; END IF;
END $$;
SET ROLE service_role;
DO $$ DECLARE f record; e record; s text; BEGIN
 SELECT * INTO f FROM proof_fixture WHERE kind='faq';
 SELECT * INTO e FROM proof_fixture WHERE kind='editorial';
 s:=public.geo_commit_auto_faq(f.item->>'q',f.item,f.proofs)->>'status';
 IF s IS DISTINCT FROM 'disabled' THEN RAISE EXCEPTION 'pause bypass: %',s; END IF;
END $$;
RESET ROLE;
UPDATE public.geo_publication_settings SET enabled=true;
SET ROLE service_role;
DO $$ DECLARE f record; e record; s text; BEGIN
 SELECT * INTO f FROM proof_fixture WHERE kind='faq';
 SELECT * INTO e FROM proof_fixture WHERE kind='editorial';
 s:=public.geo_commit_auto_faq(f.item->>'q',f.item||'{"a":"changed"}',f.proofs)->>'status';
 IF s IS DISTINCT FROM 'version_or_evidence_not_verified' THEN RAISE EXCEPTION 'stale FAQ version: %',s; END IF;
 s:=public.geo_commit_auto_publication(e.item->>'id',e.urls,e.proofs,e.item||'{"title":"changed"}')->>'status';
 IF s IS DISTINCT FROM 'version_or_evidence_not_verified' THEN RAISE EXCEPTION 'stale editorial version: %',s; END IF;
 s:=public.geo_commit_auto_faq(f.item->>'q',f.item,'[]'::jsonb)->>'status';
 IF s IS DISTINCT FROM 'version_or_evidence_not_verified' THEN RAISE EXCEPTION 'missing proof: %',s; END IF;
 s:=public.geo_commit_auto_faq(f.item->>'q',f.item,jsonb_set(f.proofs,'{0,checked_at}',to_jsonb(now()-interval '16 minutes')))->>'status';
 IF s IS DISTINCT FROM 'version_or_evidence_not_verified' THEN RAISE EXCEPTION 'stale proof: %',s; END IF;
 s:=public.geo_commit_auto_publication(e.item->>'id','[]'::jsonb,e.proofs,e.item)->>'status';
 IF s IS DISTINCT FROM 'verified_source_mismatch' THEN RAISE EXCEPTION 'source mismatch: %',s; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.geo_publication_events) OR EXISTS(SELECT 1 FROM public.geo_faq_publication_events) THEN RAISE EXCEPTION 'rejected requests wrote publication events'; END IF;
END $$;
SET ROLE service_role;
DO $$ DECLARE f record; e record; s text; BEGIN
 SELECT * INTO f FROM proof_fixture WHERE kind='faq';
 SELECT * INTO e FROM proof_fixture WHERE kind='editorial';
 s:=public.geo_commit_auto_faq(f.item->>'q',f.item,f.proofs)->>'status';
 IF s IS DISTINCT FROM 'published' THEN RAISE EXCEPTION 'verified fixture FAQ not committed: %',s; END IF;
 s:=public.geo_commit_auto_publication(e.item->>'id',e.urls,e.proofs,e.item)->>'status';
 IF s IS DISTINCT FROM 'published' THEN RAISE EXCEPTION 'verified fixture editorial not committed: %',s; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.geo_publication_events WHERE jsonb_array_length(claim_proofs)=2 AND after_item->>'source_verification'='independently_checked')<>1 THEN RAISE EXCEPTION 'editorial evidence not recorded'; END IF;
 IF (SELECT count(*) FROM public.geo_faq_publication_events WHERE jsonb_array_length(after_draft->'publication_claim_proofs')=2 AND published_faq->>'source_verification'='independently_checked')<>1 THEN RAISE EXCEPTION 'FAQ evidence not recorded'; END IF;
END $$;
-- Use a second pending item with valid shape to prove shared daily quota.
UPDATE public.geo_publication_settings SET daily_limit=2;
UPDATE proof_fixture SET item=jsonb_set(item,'{id}','"ed-fixture-67890"')||'{"slug":"second-guide","target":"second-guide"}' WHERE kind='editorial';
UPDATE public.content_store SET content=jsonb_set(content,'{editorialItems}',(content->'editorialItems')||jsonb_build_array((SELECT item FROM proof_fixture WHERE kind='editorial'))) WHERE id=1;
SET ROLE service_role;
DO $$ DECLARE e record; s text; BEGIN
 SELECT * INTO e FROM proof_fixture WHERE kind='editorial';
 s:=public.geo_commit_auto_publication(e.item->>'id',e.urls,e.proofs,e.item)->>'status';
 IF s IS DISTINCT FROM 'quota_reached' THEN RAISE EXCEPTION 'combined quota bypass: %',s; END IF;
END $$;
RESET ROLE;
-- The verifier is tested directly as the database owner with synthetic receipts.
DO $$ DECLARE f record; BEGIN
 SELECT * INTO f FROM proof_fixture WHERE kind='faq';
 IF public.geo_publication_receipt_valid(f.item||'{"risk_level":"high"}',f.item||'{"risk_level":"high"}',f.proofs,'faq',now()) THEN RAISE EXCEPTION 'high risk allowed'; END IF;
 IF public.geo_publication_receipt_valid(f.item||'{"q":"How do I obtain a licence?"}',f.item||'{"q":"How do I obtain a licence?"}',f.proofs,'faq',now()) THEN RAISE EXCEPTION 'regulated question mislabeled low risk'; END IF;
 IF public.geo_publication_receipt_valid(f.item,f.item,jsonb_set(f.proofs,'{1,quote}','"Unrelated quotation"'),'faq',now()) THEN RAISE EXCEPTION 'unrelated quotation allowed'; END IF;
 IF public.geo_publication_receipt_valid(f.item,f.item,jsonb_set(f.proofs,'{1,url}','"https://misa.gov.sa.evil.example/"'),'faq',now()) THEN RAISE EXCEPTION 'lookalike hostname allowed'; END IF;
END $$;
-- A cross-kind comparison and guide must not compete for the same route.
UPDATE public.geo_publication_settings SET daily_limit=10;
UPDATE proof_fixture SET item=item||'{"id":"ed-conflict-12345","kind":"comparison","slug":"fixture-guide","target":"fixture-guide"}' WHERE kind='editorial';
UPDATE public.content_store SET content=jsonb_set(content,'{editorialItems}',(content->'editorialItems')||jsonb_build_array((SELECT item FROM proof_fixture WHERE kind='editorial'))) WHERE id=1;
SET ROLE service_role;
DO $$ DECLARE e record; s text; BEGIN
 SELECT * INTO e FROM proof_fixture WHERE kind='editorial';
 s:=public.geo_commit_auto_publication(e.item->>'id',e.urls,e.proofs,e.item)->>'status';
 IF s IS DISTINCT FROM 'route_conflict' THEN RAISE EXCEPTION 'cross-kind route conflict: %',s; END IF;
END $$;
RESET ROLE;
-- Seven historical fixture events plus the two successful publications = nine.
INSERT INTO public.geo_faq_publication_events(item_id,content_fingerprint,question,risk_level,published_at)
SELECT 'quota-fixture-'||n,'quota-'||n,'Synthetic question '||n,'low',now()-interval '1 hour' FROM generate_series(1,7) n;
UPDATE proof_fixture SET item=item||'{"id":"ed-tenth-12345","kind":"guide","slug":"tenth-guide","target":"tenth-guide"}' WHERE kind='editorial';
UPDATE public.content_store SET content=jsonb_set(content,'{editorialItems}',(content->'editorialItems')||jsonb_build_array((SELECT item FROM proof_fixture WHERE kind='editorial'))) WHERE id=1;
SET ROLE service_role;
DO $$ DECLARE e record; s text; BEGIN
 SELECT * INTO e FROM proof_fixture WHERE kind='editorial';
 s:=public.geo_commit_auto_publication(e.item->>'id',e.urls,e.proofs,e.item)->>'status';
 IF s IS DISTINCT FROM 'published' THEN RAISE EXCEPTION 'tenth publication rejected: %',s; END IF;
END $$;
RESET ROLE;
UPDATE proof_fixture SET item=item||'{"q":"How can a visitor arrange reading notes?"}' WHERE kind='faq';
UPDATE public.content_store SET content=jsonb_set(content,'{drafts}',(content->'drafts')||jsonb_build_array((SELECT item FROM proof_fixture WHERE kind='faq'))) WHERE id=1;
SET ROLE service_role;
DO $$ DECLARE f record; s text; BEGIN
 SELECT * INTO f FROM proof_fixture WHERE kind='faq';
 s:=public.geo_commit_auto_faq(f.item->>'q',f.item,f.proofs)->>'status';
 IF s IS DISTINCT FROM 'quota_reached' THEN RAISE EXCEPTION 'eleventh shared publication not blocked: %',s; END IF;
END $$;
RESET ROLE;
SELECT 'GEO_ATOMIC_PUBLICATION_PROOF_TESTS_PASSED' AS result;
