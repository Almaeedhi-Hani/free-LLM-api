'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
 officialCandidateUrls,checkOfficialUrlReachable,verifyHighRiskOfficialClaims,runGuardedAutoPublishing
}=require('../.impact-test-build/lib/geo-auto-publication.js');
const {autoPublicationEligibility}=require('../.impact-test-build/lib/content-impact.js');

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
 assert.equal(autoPublicationEligibility({...candidate,risk:'high',sourceIds:[],verifiedSources:[]},
  {...policy,allowHighRisk:true},context).eligible,true,
  'user-enabled high-risk auto publication has no government source minimum');
 assert.equal(autoPublicationEligibility({...candidate,verifiedSources:[]},policy,context).eligible,true,'zero sources do not block automated publication');
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
  'owner-approved high-risk content does not require mandatory government quote verification');
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
 assert(worker.includes("optionalEditorialSources(candidate)")&&worker.includes("validateEditorialItem("));
 assert(worker.includes("const publishable=new Set(['home','trust','packages','service','guide','comparison'])"));
 assert(!worker.includes("if(!checked.length)"),'source count is never a publication gate');
 assert(!worker.includes("verifyHighRiskOfficialClaims(candidate)"),'two official quote checks no longer required');
 const nextSql=fs.readFileSync('supabase/migrations/20261118_geo_no_government_minimum_automatic_publication.sql','utf8');
 assert(nextSql.includes("('home','trust','packages','service','guide','comparison')"));
 assert(nextSql.includes("Source presence does not imply factual verification")||
        nextSql.includes("source presence does not imply factual verification"));
 assert(nextSql.includes("v_risk<>'low' AND NOT COALESCE(v_allow_sensitive,false)"));
 assert(nextSql.includes("v_sources jsonb:='[]'::jsonb"));
 assert(!nextSql.includes("sensitive_evidence_missing"));
 assert(!nextSql.includes("independent_official_sources_required"));
 assert(nextSql.includes("geo_publication_events"));
 assert(nextSql.includes("quota_reached"));
 assert(nextSql.includes("already_processed"));
 assert(nextSql.includes("REVOKE ALL ON FUNCTION public.geo_commit_auto_publication"));
 assert(nextSql.includes("GRANT EXECUTE ON FUNCTION public.geo_commit_auto_publication"));

 assert(!worker.includes("method:'DELETE'"),'autopublisher never destroys user content');
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
 console.log('PASS guarded GEO autopublishing: separately authorized sensitive eligibility with optional sources with no government requirement, external-source URL isolation, official reachability, idempotent atomic SQL, daily cap, rollback and admin controls');
})().catch(error=>{console.error(error);process.exitCode=1});
