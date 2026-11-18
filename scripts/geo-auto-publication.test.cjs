'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
 officialCandidateUrls,checkOfficialUrlReachable,runGuardedAutoPublishing
}=require('../.impact-test-build/geo-auto-publication.js');
const {autoPublicationEligibility}=require('../.impact-test-build/content-impact.js');

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
 assert.equal(autoPublicationEligibility({...candidate,verifiedSources:[]},policy,context).eligible,false);
 assert.equal(autoPublicationEligibility(candidate,{...policy,enabled:false},context).eligible,false);
 assert.equal(autoPublicationEligibility(candidate,policy,{...context,hasVersionedRollback:false}).eligible,false);
 const sql=fs.readFileSync('supabase/migrations/20261118_geo_guarded_automatic_publication.sql','utf8');
 for(const required of [
  "enabled boolean not null default false",
  "daily_limit integer not null default 1",
  "from public.geo_publication_settings where id=1 for update",
  "from public.content_store where id=1 for update",
  "v_item->>'status'<>'pending'",
  "v_item->>'risk_level'<>'low'",
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
 assert(worker.includes("if(!checked.length)")&&worker.includes("validateEditorialItem("));
 assert(worker.includes("editorialPublicationIssues(candidate).length"));
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
 console.log('PASS guarded GEO autopublishing: strict low-risk eligibility, external-source URL isolation, official reachability, idempotent atomic SQL, daily cap, rollback and admin controls');
})().catch(error=>{console.error(error);process.exitCode=1});
