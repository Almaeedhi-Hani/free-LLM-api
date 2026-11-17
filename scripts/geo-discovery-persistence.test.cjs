'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {normalizeGeoDiscoveryBatch,persistGeoDiscoveryBatch}=
 require('../.geo-ingest-test-build/lib/geo-discovery-batch.js');

const now='2026-11-17T15:00:00Z';
const candidate=(override={})=>({
 url:'https://investor-example.com.sa/services/setup#fragment',
 title:'Company formation support in Saudi Arabia',snippet:'Foreign investor assistance',
 query:'Saudi foreign company setup',language:'en',source:'tavily',
 collected_at:now,verification:'candidate',rank:null,
 rank_status:'unverified_provider_order',...override
});
const suggestion=(override={})=>({
 term:'تأسيس شركة أجنبية في السعودية',query:'شروط تأسيس شركة أجنبية',
 language:'ar',source:'google-suggest',collected_at:now,...override
});
const validated=normalizeGeoDiscoveryBatch({
 candidates:[candidate(),candidate({url:'https://company.cn/saudi',language:'zh',source:'parallel'})],
 suggestions:[suggestion(),suggestion({term:'foreign company registration Saudi Arabia',language:'en'})]
});
assert.equal(validated.candidates.length,2);
assert.equal(validated.suggestions.length,2);
assert.equal(validated.candidates[0].url,'https://investor-example.com.sa/services/setup');
assert.equal(validated.candidates[0].rank,undefined,'rank is never persisted from provider result order');
assert.equal(validated.suggestions[0].source,'google-suggest');
for(const bad of [
 {rank:1},{rank_status:'verified_serp'},{verification:'verified'},
 {url:'javascript:alert(1)'},{url:'http://127.0.0.1/admin'},
 {url:'https://user:pass@example.com/'},{url:'https://localhost/a'},
 {source:'untrusted-provider'},{language:'fr'},
 {collected_at:'not-a-date'}
]){
 assert.throws(()=>normalizeGeoDiscoveryBatch({candidates:[candidate(bad)],suggestions:[]}),
  undefined,JSON.stringify(bad));
}
for(const bad of [{source:'exa'},{rank:1},{search_volume:9000},{position:1},{language:'xx'}]){
 assert.throws(()=>normalizeGeoDiscoveryBatch({candidates:[],suggestions:[suggestion(bad)]}));
}
assert.throws(()=>normalizeGeoDiscoveryBatch({candidates:Array(16).fill(candidate()),suggestions:[]}),/bounded/);
assert.throws(()=>normalizeGeoDiscoveryBatch({candidates:[],suggestions:Array(31).fill(suggestion())}),/bounded/);
assert.throws(()=>normalizeGeoDiscoveryBatch({candidates:[],suggestions:[]}),/Empty/);

(async()=>{
 const db={keywords:new Set(),observations:new Set()};
 const writeActions={
  saveKeyword:async item=>{db.keywords.add(item.language+'|'+item.term.toLowerCase())},
  saveCandidate:async item=>{db.observations.add(item.language+'|'+item.query+'|'+item.url+'|'+item.collected_at)}
 };
 const once=await persistGeoDiscoveryBatch(validated,writeActions);
 assert.equal(once.ok,true);assert.deepEqual(once.requested,{candidates:2,keywords:2});
 assert.deepEqual(once.confirmed,{candidates:2,keywords:2});
 const twice=await persistGeoDiscoveryBatch(validated,writeActions);
 assert.equal(twice.ok,true);
 assert.equal(db.keywords.size,2,'replays must not duplicate keyword entries');
 assert.equal(db.observations.size,2,'replays must not duplicate candidate observations');
 const partial=await persistGeoDiscoveryBatch(validated,{
  saveKeyword:async()=>{},saveCandidate:async()=>{throw Error('Supabase temporarily unavailable')}
 });
 assert.equal(partial.ok,false);
 assert.deepEqual(partial.confirmed,{candidates:0,keywords:2});
 assert.equal(partial.errors.length,2,'partial storage writes are visible, not success');

 const route=fs.readFileSync('src/app/api/geo/discovery/route.ts','utf8');
 assert(route.includes("req.headers.get('x-geo-api-key')"),'new endpoint requires GEO secret');
 assert(route.includes("getSupabaseCredentials()"),'production requires persistent Supabase');
 assert(route.includes("rank:null"),'discovered positions must not be presented as Google ranks');
 assert(route.includes("rank_status:'unverified_provider_order'"),'observations retain candidate provenance');
 assert(route.includes("evidence_status:'candidate'"),'candidate is never silently verified');
 assert(route.includes("const competitor=existing||await upsertCompetitor("),'preserve manually curated competitor rows');
 assert(route.includes("if(existing&&existing.status!=='active')"),'do not reactivate disqualified competitors');
 assert(route.includes("existing.has(normalized)"),'do not overwrite manually reviewed keywords');
 assert(route.includes("if(!matches(stored))"),'unique-key conflicts must not be counted as correct evidence');
 assert(!route.includes("rank_status:'verified_serp'"),'no SERP-rank promotion');

 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 assert(runner.includes("await saveGeoDiscovery(candidates,result.suggestions)"),'GEO discovery must persist both evidence kinds');
 assert(runner.includes("output.summary.persisted_discovery_candidates"),'report confirmed candidate count');
 assert(runner.includes("output.summary.persisted_discovery_keywords"),'report confirmed keyword count');
 assert(runner.includes("result.status==='success'&&candidates.length>0&&persistence.status==='success'"),'partial persistence cannot look like pipeline success');
 assert(runner.indexOf('async function stageDiscovery()')<runner.indexOf('async function stageEvidence()'),
  'discovery persists before evidence analysis');
 const start=runner.indexOf('async function saveGeoDiscovery('),end=runner.indexOf('async function stageDiscovery()',start);
 assert(start>=0&&end>start);
 const calls=[];
 const scope={
  process:{env:{GEO_API_URL:'https://example.invalid',GEO_API_KEY:'isolation-test-only'}},
  AbortSignal:{timeout:()=>undefined},console:{},
  fetch:async(url,opts)=>{
   calls.push({url,opts});
   return {ok:true,status:200,json:async()=>({ok:true,confirmed:{candidates:2,keywords:2}})};
  }
 };
 vm.runInNewContext(runner.slice(start,end)+'\nthis.save=saveGeoDiscovery;',scope);
 const stored=await scope.save([candidate(),candidate()],[suggestion(),suggestion()]);
 assert.equal(stored.status,'success');
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://example.invalid/api/geo/discovery');
 assert.equal(JSON.parse(calls[0].opts.body).candidates.length,2);
 scope.fetch=async()=>{throw Error('network unavailable')};
 const failed=await scope.save([candidate()],[suggestion()]);
 assert.equal(failed.status,'partial');
 assert.equal(failed.confirmed.candidates,0);
 // Execute the ACTUAL Next.js route with isolated fake repository functions.
 // This covers authentication, read-back, manually curated metadata, replay
 // and partial database failure without touching live Supabase or network.
 const ts=require('typescript');
 const compiled=ts.transpileModule(route,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
 }).outputText;
 const fake={
  keywords:[{term:suggestion().term,language:'ar',source:'manual',search_volume:77,intent:'commercial'}],
  competitors:new Map([['investor-example.com.sa',{
   id:'manual-c1',domain:'investor-example.com.sa',name:'Reviewed Company',source:'manual',
   notes:'Reviewed by analyst',status:'active'
  }]]),
  observations:[]
 };
 let configured=true,failCandidate=false;
 const fakeMarket={
  listKeywords:async({language})=>fake.keywords.filter(k=>k.language===language),
  upsertKeyword:async item=>{const stored={...item,id:'keyword-'+(fake.keywords.length+1)};fake.keywords.push(stored);return stored},
  getCompetitor:async domain=>fake.competitors.get(domain)||null,
  upsertCompetitor:async item=>{const stored={...item,id:'comp-'+(fake.competitors.size+1),status:'active'};fake.competitors.set(item.domain,stored);return stored},
  listObservations:async id=>fake.observations.filter(o=>o.competitor_id===id),
  recordObservation:async item=>{
   if(failCandidate)throw Error('Simulated Supabase write failure');
   // Supabase/PostgREST returns the UTC offset in a different but equivalent
   // spelling and returns a pre-existing observation on a unique-key conflict.
   const conflict=fake.observations.find(o=>o.competitor_id===item.competitor_id&&
    o.language===item.language&&o.query===item.query&&
    Date.parse(o.observed_at)===Date.parse(item.observed_at));
   if(conflict)return conflict;
   const stored={...item,id:'obs-'+(fake.observations.length+1),
    observed_at:item.observed_at.replace(/Z$/,'+00:00')};
   fake.observations.push(stored);return stored;
  }
 };
 const routeModule={exports:{}};
 const providers={
  'next/server':{NextResponse:{json:(data,opts={})=>({status:opts.status||200,json:async()=>data})}},
  'crypto':require('node:crypto'),
  '@/lib/storage-mode':{getSupabaseCredentials:()=>configured?{url:'https://supabase.invalid',key:'fake'}:null},
  '@/lib/market-intelligence':fakeMarket,
  '@/lib/geo-discovery-batch':require('../.geo-ingest-test-build/lib/geo-discovery-batch.js')
 };
 vm.runInNewContext(compiled,{
  exports:routeModule.exports,module:routeModule,require:name=>{
   if(!Object.prototype.hasOwnProperty.call(providers,name))throw Error('Unexpected import '+name);
   return providers[name];
  },
  Buffer,URL,process:{env:{GEO_API_KEY:'local-test-key'}},
  console:{error:()=>{}}
 });
 const POST=routeModule.exports.POST;
 assert.equal(typeof POST,'function');
 const request=(body,key='local-test-key')=>({
  headers:{get:name=>name==='x-geo-api-key'?key:name==='content-length'?String(JSON.stringify(body).length):null},
  text:async()=>JSON.stringify(body)
 });
 const data={candidates:[candidate(),candidate({url:'https://company.cn/saudi',language:'zh',source:'parallel'})],
  suggestions:[suggestion(),suggestion({term:'foreign company registration Saudi Arabia',language:'en'})]};
 let response=await POST(request(data,'wrong-key'));
 assert.equal(response.status,401,'unauthenticated discovery cannot write');
 assert.equal(fake.observations.length,0);
 configured=false;
 response=await POST(request(data));
 assert.equal(response.status,503,'missing persistent Supabase must fail closed');
 configured=true;
 response=await POST(request(data));
 assert.equal(response.status,200,'the actual route accepts safe bounded discovery');
 let body=await response.json();
 assert.equal(body.confirmed.candidates,2);
 assert.equal(body.confirmed.keywords,2);
 assert.equal(fake.observations.length,2);
 assert.equal(fake.keywords.length,2,'one previously curated keyword and one new suggestion');
 assert.equal(fake.competitors.size,2,'one curated competitor and one new candidate');
 assert.equal(fake.competitors.get('investor-example.com.sa').name,'Reviewed Company');
 assert.equal(fake.competitors.get('investor-example.com.sa').source,'manual');
 assert.equal(fake.keywords.find(k=>k.language==='ar').search_volume,77,'manual search volumes unchanged');
 assert(fake.observations.every(o=>o.rank===null&&o.raw.rank_status==='unverified_provider_order'&&o.raw.evidence_status==='candidate'));
 response=await POST(request(data));
 assert.equal(response.status,200,'ambiguous replay must be read-back idempotent');
 assert.equal(fake.observations.length,2);
 assert.equal(fake.keywords.length,2);
 assert(fake.observations.every(o=>o.observed_at.endsWith('+00:00')),
  'fake storage must simulate the actual PostgREST timestamp format');
 response=await POST(request({candidates:[candidate({url:'https://investor-example.com.sa/different-page'})],suggestions:[]}));
 assert.equal(response.status,502,'same unique observation key with different URL must remain a conflict');
 assert.equal(fake.observations.length,2,'conflicting evidence cannot create a new observation');
 response=await POST(request({...data,candidates:[candidate({rank:2})]}));
 assert.equal(response.status,422,'reject a search-provider rank assertion');
 response=await POST(request({...data,candidates:[candidate({url:'https://misa.gov.sa/official'})]}));
 assert.equal(response.status,502,'government pages cannot silently be registered as rivals');
 assert.equal(fake.competitors.size,2);
 failCandidate=true;
 response=await POST(request({candidates:[candidate({url:'https://newfirm.example.com/page'})],suggestions:[]}));
 assert.equal(response.status,502,'database failure must return partial, not fake success');
 body=await response.json();
 assert.equal(body.ok,false);
 assert.equal(body.confirmed.candidates,0);
 assert.equal(body.errors.length,1);
 console.log('PASS actual GEO discovery POST with isolated database mock: auth, read-back, replay, curated records, no ranked SERP, partial failure');
 console.log('PASS bounded trilingual research ingestion, source provenance, idempotence, no fabricated ranks, partial failures and guarded single-attempt GEO bridge');
})().catch(e=>{console.error(e);process.exitCode=1});
