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
 console.log('PASS bounded trilingual research ingestion, source provenance, idempotence, no fabricated ranks, partial failures and guarded single-attempt GEO bridge');
})().catch(e=>{console.error(e);process.exitCode=1});
