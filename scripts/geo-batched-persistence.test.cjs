'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Test the actual GitHub Actions GEO runner persistence function, not a copy.
const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
const start=runner.indexOf('async function saveGeoDiscovery(');
const end=runner.indexOf('async function stageDiscovery()',start);
assert(start>=0&&end>start,'actual GEO persistence function must exist');
const candidates=Array.from({length:10},(_,i)=>({url:'https://company'+i+'.example.com/about',
  query:'Saudi company formation',language:'en',source:'tavily',collected_at:'2026-11-18T00:00:00Z'}));
const suggestions=Array.from({length:21},(_,i)=>({term:'Saudi company formation '+i,
  query:'Saudi company formation',language:'en',source:'google-suggest',collected_at:'2026-11-18T00:00:00Z'}));

function makeHarness(fetch){
 const scope={
  process:{env:{GEO_API_URL:'https://geo.example.invalid/',GEO_API_KEY:'isolated-only'}},
  AbortSignal:{timeout:ms=>({timeoutMs:ms})},
  console:{},fetch
 };
 vm.runInNewContext(runner.slice(start,end)+'\nthis.save=saveGeoDiscovery;',scope);
 return scope.save;
}
(async()=>{
 const calls=[];
 const save=makeHarness(async(url,options)=>{
  const batch=JSON.parse(options.body);
  calls.push(batch);
  assert.equal(url,'https://geo.example.invalid/api/geo/discovery');
  assert.equal(options.method,'POST');
  assert.equal(options.headers['x-geo-api-key'],'isolated-only');
  assert.equal(options.signal.timeoutMs,30000,'each small chunk has a bounded deadline');
  assert(batch.candidates.length<=2&&batch.suggestions.length<=3,'each request remains small');
  return {ok:true,status:200,json:async()=>({
   ok:true,confirmed:{candidates:batch.candidates.length,keywords:batch.suggestions.length}
  })};
 });
 const success=await save(candidates,suggestions);
 assert.equal(success.status,'success');
 assert.equal(success.batches,7,'21 suggestions + 10 candidates need seven small requests');
 assert.equal(success.confirmed.candidates,10);
 assert.equal(success.confirmed.keywords,21);
 assert.equal(calls.length,7);
 assert.deepEqual(calls.flatMap(x=>x.candidates).map(x=>x.url),candidates.map(x=>x.url),
  'all evidence is sent exactly once, in input order');
 assert.deepEqual(calls.flatMap(x=>x.suggestions).map(x=>x.term),suggestions.map(x=>x.term));

 let requests=0;
 const partiallySaved=makeHarness(async(_,options)=>{
  requests++;
  const batch=JSON.parse(options.body);
  if(requests===3)return {ok:false,status:502,json:async()=>({
    ok:false,confirmed:{candidates:0,keywords:1},errors:['storage failed after a partial write']
  })};
  return {ok:true,status:200,json:async()=>({
   ok:true,confirmed:{candidates:batch.candidates.length,keywords:batch.suggestions.length}
  })};
 });
 const partial=await partiallySaved(candidates,suggestions);
 assert.equal(partial.status,'partial');
 assert.equal(requests,3,'do not continue to issue writes after an acknowledged partial failure');
 assert.equal(partial.confirmed.candidates,4,'count only confirmed saved candidates');
 assert.equal(partial.confirmed.keywords,7,'count partially confirmed keywords even on HTTP 502');

 requests=0;
 const ambiguousTimeout=makeHarness(async(_,options)=>{
  requests++;
  const batch=JSON.parse(options.body);
  if(requests===3)throw Error('The operation was aborted due to timeout');
  return {ok:true,status:200,json:async()=>({
   ok:true,confirmed:{candidates:batch.candidates.length,keywords:batch.suggestions.length}
  })};
 });
 const ambiguous=await ambiguousTimeout(candidates,suggestions);
 assert.equal(ambiguous.status,'partial');
 assert.equal(requests,3,'a timeout must NEVER retry potentially committed writes');
 assert.equal(ambiguous.confirmed.candidates,4);
 assert.equal(ambiguous.confirmed.keywords,6);
 assert.match(ambiguous.error,/timeout/);

 const invalid=makeHarness(async()=>({ok:true,status:200,json:async()=>({
  ok:true,confirmed:{candidates:99,keywords:99}
 })}));
 const rejected=await invalid(candidates,suggestions);
 assert.equal(rejected.status,'partial','impossible acknowledgements cannot count as success');
 assert.equal(rejected.confirmed.candidates,0);
 assert.equal(rejected.confirmed.keywords,0);
 const reused=makeHarness(async(_,options)=>{
  const chunk=JSON.parse(options.body);
  return {ok:true,status:200,json:async()=>({
   ok:true,confirmed:{candidates:chunk.candidates.length,keywords:chunk.suggestions.length},
   keyword_persistence:{inserted:0,existing:chunk.suggestions.length}
  })};
 });
 const reusedResult=await reused(candidates,suggestions);
 assert.equal(reusedResult.status,'success');
 assert.equal(reusedResult.confirmed.keywords,21,'recognized suggestions remain acknowledged');
 assert.equal(reusedResult.keyword_changes.inserted,0,'existing keywords cannot count as new inserts');
 assert.equal(reusedResult.keyword_changes.existing,21,'all existing keywords correctly classified');
 assert.equal(success.keyword_changes,null,'legacy API acknowledgements cannot invent insert counts');
 const reviewed=makeHarness(async(_,options)=>{
  const chunk=JSON.parse(options.body);
  return {ok:true,status:200,json:async()=>({
   ok:true,confirmed:{candidates:0,keywords:0},
   reviewer_excluded:{candidates:chunk.candidates.length,keywords:chunk.suggestions.length},
   keyword_persistence:{inserted:0,existing:0}
  })};
 });
 const filtered=await reviewed(candidates,suggestions);
 assert.equal(filtered.status,'success','intentional reviewer skip is not a fake persistence failure');
 assert.deepEqual(filtered.confirmed,{candidates:0,keywords:0});
 assert.equal(filtered.reviewer_excluded.candidates,10);
 assert.equal(filtered.reviewer_excluded.keywords,21);
 const fakeSkipped=makeHarness(async(_,options)=>{
  const chunk=JSON.parse(options.body);
  return {ok:true,status:200,json:async()=>({
   ok:true,confirmed:{candidates:0,keywords:0},
   reviewer_excluded:{candidates:chunk.candidates.length+1,keywords:chunk.suggestions.length}
  })};
 });
 const badSkipped=await fakeSkipped(candidates,suggestions);
 assert.equal(badSkipped.status,'partial','impossible reviewer skip count must never be trusted');
 console.log('PASS GEO storage batching: confirmed records separated from new/existing keywords; strict bounded persistence');
})().catch(e=>{console.error(e);process.exitCode=1});
