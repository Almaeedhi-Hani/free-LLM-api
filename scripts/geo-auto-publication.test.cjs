'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
 officialCandidateUrls,checkOfficialUrlReachable,verifyHighRiskOfficialClaims,runGuardedAutoPublishing
}=require('../.impact-test-build/lib/geo-auto-publication.js');
const {autoPublicationEligibility}=require('../.impact-test-build/lib/content-impact.js');
const {parsePublicationOrigin,publicationAuditPayload,appendPublicationAudit}=require('../.impact-test-build/lib/geo-publication-audit.js');

(async()=>{
 const base={
  id:'ed-low-safe-123456',kind:'guide',lang:'en',target:'safe-market-orientation',
  slug:'safe-market-orientation',status:'pending',risk_level:'low',
  title:'General Saudi research process',summary:'Official source references and publishing',
  body:'A neutral investor-facing orientation guide with no unverified licensing claims.'.repeat(3),
  evidence_ids:['ev001'],evidence_refs:[]
 };
 const links=[
  {kind:'official_candidate',url:'https://misa.gov.sa/en/',source:'research',id:'o1'},
  {kind:'official-manual',url:'https://www.gov.sa/',source:'human-review',id:'o2'},
  {kind:'competitor_candidate',url:'https://example.com/',source:'search',id:'b1'},
  {kind:'official_candidate',url:'https://gov.sa.evil.example/',source:'research',id:'b2'},
  {kind:'official_candidate',url:'http://misa.gov.sa/',source:'research',id:'b3'},
  {kind:'official_candidate',url:'https://user@xyz.gov.sa/',source:'research',id:'b4'}
 ];
 assert.deepEqual(officialCandidateUrls({...base,evidence_refs:links}),
  ['https://misa.gov.sa/en/','https://www.gov.sa/']);
 let called=0;
 const mock=async(url,options)=>{called++;
  assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');
  assert(/^https:\/\/(?:[a-z-]+\.)*gov\.sa/.test(url));
  return {ok:true,headers:{get:()=> 'text/html; charset=utf-8'},body:{cancel:async()=>{}}};
 };
 assert.equal(await checkOfficialUrlReachable('https://misa.gov.sa/en/',mock),true);
 assert.equal(await checkOfficialUrlReachable('https://misa.gov.sa.evil.test/',mock),false);
 assert.equal(called,1,'untrusted external hostname must never be fetched');
 assert.equal(await checkOfficialUrlReachable('https://misa.gov.sa/en/',async()=>({ok:false,headers:{get:()=> 'text/html'}})),false);
 assert.equal(await checkOfficialUrlReachable('https://misa.gov.sa/en/',async()=>({ok:true,headers:{get:()=> 'application/pdf'}})),false);
 const report=await runGuardedAutoPublishing(true);
 assert(['storage_unavailable','disabled','dry_run'].includes(report.status),'local environment must fail closed');

 const candidate={
  id:'editorial:ed-low-safe-123456',kind:'guide',category:'page',lang:'en',
  title:base.title,summary:base.summary,body:base.body,status:'pending',
  origin:'geo_editorial',createdAt:null,updatedAt:null,
  targetPath:'/en/insights/safe-market-orientation',risk:'low',
  sourceIds:['ev001'],verifiedSources:['https://misa.gov.sa/en/'],
  sections:[],primaryKeyword:'Saudi research',itemId:base.id,draftIndex:null,faqIndex:null
 };
 const policy={mode:'guarded_automatic',enabled:true,maxDailyPages:1};
 const context={hasVersionedRollback:true,hasIdempotencyKey:true,officialSourcesIndependentlyChecked:true};
 assert.equal(autoPublicationEligibility(candidate,policy,context).eligible,true);
 assert.equal(autoPublicationEligibility({...candidate,risk:'high'},policy,context).eligible,false);
 assert.equal(autoPublicationEligibility({...candidate,verifiedSources:[]},policy,context).eligible,true,'missing sources must not block publication');
 assert.equal(autoPublicationEligibility(candidate,{...policy,enabled:false},context).eligible,false);
 assert.equal(autoPublicationEligibility(candidate,policy,{...context,hasVersionedRollback:false}).eligible,false);
 const highBody=[
  'An investor should use official government pages to verify applicable business registrations before relying on information published by third parties.',
  'An investor should confirm operational filing requirements from the responsible authority directly rather than treating summary guides as legal advice.'
 ].join(' ');
 const highClaims=[
  {url:'https://misa.gov.sa/en/',claim:'An investor should use official government pages to verify applicable business registrations',quote:'Always review the latest official investment guidance before submitting a business request.'},
  {url:'https://mc.gov.sa/en/',claim:'An investor should confirm operational filing requirements from the responsible authority directly',quote:'The responsible authority publishes current company filing instructions on its government website.'}
 ];
 const highCandidate={...base,risk_level:'high',body:highBody,
  evidence_refs:[
   {id:'official1',source:'research',kind:'official_candidate',url:highClaims[0].url},
   {id:'official2',source:'research',kind:'official_candidate',url:highClaims[1].url}
  ],claim_evidence:highClaims};
 let remoteCalls=0;
 const officialFetch=async(url,options)=>{
  remoteCalls++;
  assert.equal(options.redirect,'manual');
  const quote=highClaims.find(x=>x.url===url)?.quote;
  assert(quote);
  return {ok:true,headers:{get:(name)=>name==='content-type'?'text/html':'2048'},
   text:async()=>'<html><main><p>'+quote+'</p></main></html>'};
 };
 const verified=await verifyHighRiskOfficialClaims(highCandidate,officialFetch);
 assert(verified&&verified.proofs.length===2&&verified.urls.length===2);
 assert.equal(verified.proofs[0].verified_by,'live_official_exact_quote');
 assert.equal(remoteCalls,2);
 assert.equal(await verifyHighRiskOfficialClaims({...highCandidate,claim_evidence:[
   highClaims[0],{...highClaims[1],quote:'This quote is fabricated and not present on any official page.'}
 ]},officialFetch),null,'fabricated government quotes must fail');
 assert.equal(await verifyHighRiskOfficialClaims({...highCandidate,claim_evidence:[
   highClaims[0],{...highClaims[1],url:'https://misa.gov.sa/en/'}
 ]},officialFetch),null,'one government authority is insufficient');
 assert.equal(await verifyHighRiskOfficialClaims({...highCandidate,claim_evidence:[
   highClaims[0],{...highClaims[1],url:'https://mc.gov.sa.evil.com/'}
 ]},officialFetch),null,'lookalike host cannot be fetched');
 assert.equal(await verifyHighRiskOfficialClaims({...highCandidate,claim_evidence:[
   {...highClaims[0],claim:'This claim is not written in the published article'},highClaims[1]
 ]},officialFetch),null,'the verified claim must be present in article body');
 assert.equal(await verifyHighRiskOfficialClaims({...highCandidate,claim_evidence:[]},officialFetch),null,
  'legacy high-risk content without quotes remains blocked');
 const highPolicy={...policy,allowHighRisk:true};
 assert.equal(autoPublicationEligibility({...candidate,risk:'high'},highPolicy,
  {...context,highRiskClaimsVerified:true}).eligible,true,
  'high-risk content is eligible after explicit opt-in and real claim verification');
 assert.equal(autoPublicationEligibility({...candidate,risk:'high'},highPolicy,context).eligible,true,
  'high-risk content without citations is allowed after separate permission');
 const sql=fs.readFileSync('supabase/migrations/20261118_geo_guarded_automatic_publication.sql','utf8');
 for(const required of [
  "enabled boolean not null default false",
  "daily_limit integer not null default 1",
  "from public.geo_publication_settings where id=1 for update",
  "from public.content_store where id=1 for update",
  "v_item->>'status'<>'pending'",
  "v_risk not in ('low','medium','high')",
  "allow_high_risk boolean not null default false",
  "sensitive_evidence_missing",
  "independent_official_sources_required",
  "sensitive_quota_reached",
  "missing_fresh_claim_verification",
  "v_item->>'kind' not in ('guide','comparison')",
  "geo_publication_events",
  "content_fingerprint",
  "unique(item_id,content_fingerprint)",
  "review_required",
  "quota_reached",
  "route_conflict",
  "already_processed",
  "is distinct from v_event.after_item",
  "set search_path = ''",
  "revoke all on function public.geo_commit_auto_publication",
  "revoke all on function public.geo_rollback_auto_publication",
  "to service_role"
 ])assert(sql.includes(required),'Missing atomic publication security invariant: '+required);
 const worker=fs.readFileSync('src/lib/geo-auto-publication.ts','utf8');
 assert(worker.includes("optionalResearchCitations(candidate,competitorDomains)")&&worker.includes("validateEditorialItem("));
 assert(worker.includes("editorialPublicationIssues(x).length")||worker.includes("editorialPublicationIssues(candidate)"),"unfinished visitor-copy instructions must not be misrepresented as a finished public article");
 assert(!worker.includes("method:'DELETE'"),'autopublisher never destroys user content');
 const upgrade=fs.readFileSync('supabase/migrations/20261118_geo_source_optional_unattended_publish.sql','utf8');
 for(const expected of [
  "CREATE OR REPLACE FUNCTION public.geo_commit_auto_publication",
  "CREATE OR REPLACE FUNCTION public.geo_commit_auto_faq",
  "CREATE OR REPLACE FUNCTION public.geo_rollback_auto_faq",
  "'source_verification','not_independently_checked'",
  "'cited_sources',p_verified_urls",
  "jsonb_array_length(p_verified_urls)>12",
  "FOREIGN" // replaced by next assertion, see below
 ])if(expected!=='FOREIGN')assert(upgrade.includes(expected),'Missing source-optional publication contract: '+expected);
 assert(!upgrade.includes('independent_official_sources_required'),'No two-government-source requirement may remain in new RPC');
 assert(!upgrade.includes('jsonb_array_length(p_verified_urls)<2'),'No minimum sources required');
 assert(!upgrade.includes('sensitive_evidence_missing'),'No mandatory risk-claim quote mapping');
 assert(upgrade.includes("v_risk<>'low' AND NOT coalesce(v_sensitive,false)"),
  'High-risk publishing must remain explicitly owner-enabled');
 assert(upgrade.includes('geo_faq_publication_events'),'Auditable FAQ publication and rollback required');
 const daily=fs.readFileSync('.github/workflows/geo-auto-publication-daily.yml','utf8');
 const publicationCrons=Array.from(daily.matchAll(/- cron: '(\d+) (\d+) \* \* \*'/g))
   .map(m=>[Number(m[1]),Number(m[2])]);
 assert.deepEqual(publicationCrons,[1,3,5,7,9,11,13,15,17,19,21,23].map(hour=>[50,hour]),
   'publisher must preserve the same original 2-hour UTC instants via individual cron events');
 assert(daily.includes('node scripts/scheduled-event-slot.cjs --kind=publication'),
   'publisher must select post-Nov22 slots from immutable GitHub event metadata, not runner clock');
 assert(worker.includes('daily_limit'),'increased checks must continue to use the existing DB rolling 24-hour quota');
 assert(daily.includes('/api/geo/auto-publication')&&!daily.includes('opencode-geo-analysis.js'),
  'publication polling should not invoke the GEO research provider');
 assert(daily.includes("curl --fail-with-body --retry 0"),'never retry ambiguous network publication');
 const publicPage=fs.readFileSync('src/app/insights/[slug]/page.tsx','utf8');
 assert(!publicPage.includes('not independently verified') &&
  publicPage.includes('page.cited_sources') &&
  publicPage.includes('lang==="ar"?"المراجع"'),
  'articles should retain real citation links under a neutral heading without a visitor-facing verification notice or false verified status');
 const scheduled=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
 assert(scheduled.includes('Guarded automatic publication after a successful GEO cycle'));
 assert(scheduled.includes('curl --fail-with-body --retry 0'),'never retry ambiguous publication');
 const cron=fs.readFileSync('src/app/api/geo/auto-publication/route.ts','utf8');
 assert(cron.includes("req.headers.get('x-geo-api-key')"));
 assert(!cron.includes('export async function GET'),'no unsecured GET publishing');
 const admin=fs.readFileSync('src/app/api/admin/geo-publication/route.ts','utf8');
 assert(admin.includes("body.confirm!=='ENABLE_GUARDED_AUTOMATIC_PUBLICATION'"));
 assert(admin.includes("body.confirm!=='ROLLBACK_GEO_PUBLICATION'"));
 assert(admin.includes("ENABLE_AUTONOMOUS_SENSITIVE_CONTENT"));
 assert(admin.includes("UNDERSTAND_SOURCE_VERIFICATION_LIMITS"));

 // Phase 1.4: W01 and W03 must share one transactional publisher, with
 // identifiable, non-PII audit records. All network writes below are mocked.
 const headers=new Headers({
  'x-geo-source-workflow':'W01','x-geo-github-run-id':'44612345678',
  'x-geo-github-run-attempt':'2','x-geo-github-event':'schedule'
 });
 const origin=parsePublicationOrigin(headers);
 assert.deepEqual(origin,{source_workflow:'W01',github_run_id:'44612345678',
  github_run_attempt:2,event_type:'schedule'});
 assert.equal(parsePublicationOrigin(new Headers()).source_workflow,'unattributed_api',
  'legacy server-to-server clients are labeled unattributed, never falsely W01/W03');
 assert.throws(()=>parsePublicationOrigin(new Headers({'x-geo-source-workflow':'W01'})),
  /invalid_publication_origin/,'partial origin cannot be silently trusted');
 assert.throws(()=>parsePublicationOrigin(new Headers({
  'x-geo-source-workflow':'W03','x-geo-github-run-id':'1',
  'x-geo-github-run-attempt':'1','x-geo-github-event':'push'
 })),/invalid_publication_origin/,'W03 must never claim a push event');
 const faqQuestion='Private customer information 0550000000';
 const auditStart=publicationAuditPayload({kind:'faq',itemId:faqQuestion,
  phase:'rpc_started',origin});
 const auditJson=JSON.stringify(auditStart);
 assert(!auditJson.includes(faqQuestion),'FAQ questions and PII must never be in audit payload');
 assert.equal(auditStart.entity_type,'geo_faq');
 assert.match(auditStart.entity_id,/^sha256:[a-f0-9]{64}$/);
 assert.equal(auditStart.metadata.github_run_id,'44612345678');
 const resultAudit=publicationAuditPayload({kind:'editorial',itemId:'ed-safe-12345678',
  phase:'rpc_result',result:'already_processed',origin,
  startedAuditId:'00000000-0000-4000-8000-000000000001',
  publicationEventId:'00000000-0000-4000-8000-000000000002'});
 assert.equal(resultAudit.metadata.result,'already_processed');
 assert.equal(resultAudit.metadata.publication_event_id,'00000000-0000-4000-8000-000000000002');
 assert.equal(resultAudit.metadata.started_audit_id,'00000000-0000-4000-8000-000000000001');
 const previousFetch=global.fetch;
 const previousUrl=process.env.SUPABASE_URL;
 const previousKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const mockedRows=[];
 try{
  process.env.SUPABASE_URL='https://unit-test.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY='unit-test-role-only';
  global.fetch=async(url,opts)=>{
   assert.equal(url,'https://unit-test.invalid/rest/v1/audit_logs?select=id');
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers.Prefer,'return=representation');
   const payload=JSON.parse(opts.body);
   mockedRows.push(payload);
   return {ok:true,json:async()=>[{id:'00000000-0000-4000-8000-000000000003'}]};
  };
  const id=await appendPublicationAudit({kind:'editorial',
   itemId:'ed-safe-12345678',phase:'rpc_started',origin});
  assert.equal(id,'00000000-0000-4000-8000-000000000003');
  assert.equal(mockedRows.length,1);
  assert.equal(mockedRows[0].metadata.source_workflow,'W01');
  global.fetch=async()=>({ok:false,status:503});
  await assert.rejects(appendPublicationAudit({kind:'editorial',
   itemId:'ed-safe-12345678',phase:'rpc_started',origin}),/publication_audit_write_503/);
 }finally{
  global.fetch=previousFetch;
  if(previousUrl===undefined)delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL=previousUrl;
  if(previousKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY=previousKey;
 }
 const w01=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
 for(const [workflow,kind] of [[w01,'W01'],[daily,'W03']]){
  assert(workflow.includes('-H "x-geo-source-workflow: '+kind+'"'),
   kind+' must label the authenticated publisher request');
  for(const name of ['x-geo-github-run-id','x-geo-github-run-attempt','x-geo-github-event'])
   assert(workflow.includes('-H "'+name+': '),kind+' missing immutable run metadata '+name);
  assert(workflow.includes('/api/geo/auto-publication'));
  assert(workflow.includes('curl --fail-with-body --retry 0'),
   kind+' must not blindly retry an ambiguous write');
 }
 const auditWorker=fs.readFileSync('src/lib/geo-auto-publication.ts','utf8');
 for(const rpc of ['rpc/geo_commit_auto_publication','rpc/geo_commit_auto_faq']){
  assert(auditWorker.includes(rpc));
  assert(auditWorker.includes("phase:'rpc_started'")||
   auditWorker.includes("'rpc_started'"),'audit must precede publication RPC');
 }
 assert(auditWorker.includes('catch{return storageAuditFailure()}'),
  'a missing pre-attempt audit must fail closed before the RPC');
 assert(auditWorker.includes("'rpc_result','ambiguous'"),
  'ambiguous replies must be logged as ambiguous, never auto-retried');
 const liveSql=upgrade.toLowerCase();
 for(const functionName of ['geo_commit_auto_publication','geo_commit_auto_faq']){
  const start=liveSql.indexOf('create or replace function public.'+functionName+'(');
  const end=liveSql.indexOf('end '+String.fromCharCode(36,36)+';',start);
  assert(start>=0&&end>start,'publisher RPC missing: '+functionName);
  const body=liveSql.slice(start,end);
  const policyLock=body.indexOf('from public.geo_publication_settings where id=1 for update');
  const contentLock=body.indexOf('from public.content_store where id=1 for update');
  const sharedQuota=body.indexOf('public.geo_publication_events e');
  const faqQuota=body.indexOf('public.geo_faq_publication_events f');
  assert(policyLock>0&&contentLock>policyLock&&sharedQuota>contentLock&&faqQuota>contentLock,
   functionName+' must serialize and check combined editorial+FAQ quota inside one transaction');
  assert(body.includes('quota_reached'),functionName+' must preserve quota result');
 }
 assert(sql.includes('UNIQUE(item_id,content_fingerprint)')||
   sql.toLowerCase().includes('unique(item_id,content_fingerprint)'));
 assert(upgrade.toLowerCase().includes('unique(item_id,content_fingerprint)'));
 console.log('PASS phase1.4 publisher origin, PII-safe audit, failure-to-audit response, shared lock and no blind retries');
 console.log('PASS GEO autopublishing: source-optional sensitive content, unrelated official quote helper, historical transaction audits, daily quota, FAQ publisher and admin rollback');
})().catch(error=>{console.error(error);process.exitCode=1});
