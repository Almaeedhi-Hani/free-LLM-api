'use strict';
const assert=require('node:assert/strict');
const {createPreparedQuotaFetch,stableAttempt,PROVIDERS,QuotaPreflightError}
  =require('./v3-provider-preflight-prepared.cjs');
const search=require('../src/lib/provider-search.cjs');
const model=require('./geo-direct-model-providers.cjs');

(async()=>{
 assert.deepEqual(PROVIDERS,['exa','tavily','parallel','firecrawl','groq','gemini','nvidia','openrouter']);
 const id={runId:'45077365233',stage:'w01-discovery',provider:'exa',body:'{"query":"test"}'};
 assert.equal(stableAttempt(id),stableAttempt(id),'retry must keep same idempotency key');
 assert.notEqual(stableAttempt(id),stableAttempt({...id,body:'{"query":"different"}'}));
 assert.equal(stableAttempt({...id,runId:'not-a-schedule'}),null);
 assert.equal(stableAttempt({...id,stage:'../../wrong'}),null);
 assert(!stableAttempt(id).includes('query'),'no request or prompt may leak into ledger key');

 let realCalls=0,reservations=[];
 const connected=async(url,request)=>{
  realCalls++;
  assert.equal(request.method,'POST');
  if(url.includes('tavily'))return {ok:true,status:200,json:async()=>({results:[
   {url:'https://investor-example.sa/svc',title:'Saudi investor services'}
  ]})};
  throw Error('unapproved outbound route');
 };
 const guard=createPreparedQuotaFetch({
  runId:id.runId,stage:'w01-discovery',fetchFn:connected,
  reserve:async row=>{reservations.push(row);return {
    status:row.provider==='exa'?'quota_reached':'reserved'
  };}
 });
 const outcome=await search.search({
  queries:[{query:'Saudi investor services',language:'en'}],
  providers:['exa','tavily'],env:{EXA_API_KEY:'fixture-exa',TAVILY_API_KEY:'fixture-tavily'},
  maxCalls:2,fetchFn:guard
 });
 assert.equal(outcome.results.length,1);
 assert.equal(outcome.results[0].source,'tavily');
 assert.equal(realCalls,1,'denied exa must never reach outbound fetch, even through fallback');
 assert.deepEqual(reservations.map(r=>r.provider),['exa','tavily']);
 assert(reservations.every(r=>r.tokenUnits===0&&r.requestUnits===1&&r.attemptKey.startsWith(id.runId+':')));
 assert.equal(new Set(reservations.map(r=>r.attemptKey)).size,2);
 console.log('PASS prepared search guard: denied Exa, single authorized Tavily fallback, two independently reserved attempts');

 // Test every fixed model provider against its REAL adapter, with an offline
 // fake HTTP transport, not merely unit-test an invented wrapper interface.
 const good={opportunities:[],goals:[],drafts:[],editorial_actions:[]};
 const modelEnv=Object.fromEntries(model.PROVIDERS.map(p=>[p.key,'fictional-fixture-'+p.id]));
 let modelHTTP=0,modelReserves=[];
 const modelGuard=createPreparedQuotaFetch({
  runId:'45077365233',stage:'w01-model-ar',
  maxModelTokensByProvider:{groq:9500,gemini:12000,nvidia:9500,openrouter:9500},
  fetchFn:async(url)=>{
   modelHTTP++;
   const provider=model.PROVIDERS.find(p=>p.endpoint===url)?.id;
   return {ok:true,status:200,json:async()=>provider==='gemini'
    ?{candidates:[{content:{parts:[{text:JSON.stringify(good)}]}}]}
    :{choices:[{message:{content:JSON.stringify(good)}}]}};
  },
  reserve:async data=>{modelReserves.push(data);return {status:
    data.provider==='groq'?'reserved':data.provider==='gemini'?'quota_reached':
    data.provider==='nvidia'?'duplicate_reservation':'unconfigured'};}
 });
 for(const p of model.PROVIDERS){
  const ans=await model.generate('Public research, no claim',p.id+':'+p.model,
    {env:modelEnv,fetchFn:modelGuard});
  if(p.id==='groq')assert.deepEqual(ans.data,good);
  else assert.equal(ans.error,'network_or_response_error',
    'legacy adapter masks unapproved result; user-facing quota status must be wired later');
 }
 assert.equal(modelHTTP,1,'only the genuinely reserved model may reach network');
 assert.equal(modelReserves.length,4);
 assert(modelReserves.every(r=>r.tokenUnits>4500&&r.requestUnits===1));
 assert(modelReserves.every(r=>!JSON.stringify(r).includes('fictional-fixture')));
 console.log('PASS prepared direct-model guard: 4 providers checked, 1 reserved network call, 3 denied');

 let duplicateHTTP=0;
 const seen=new Set();
 const idempotent=createPreparedQuotaFetch({
  runId:'45077365233',stage:'w01-model-zh',
  maxModelTokensByProvider:{groq:9500},
  fetchFn:async()=>{duplicateHTTP++;return {ok:true,status:200,json:async()=>({choices:[{message:{
    content:JSON.stringify(good)}}]})};},
  reserve:async data=>{if(seen.has(data.attemptKey))return {status:'duplicate_reservation'};
    seen.add(data.attemptKey);return {status:'reserved'};}
 });
 const groq=model.PROVIDERS.find(p=>p.id==='groq');
 const key='groq:'+groq.model;
 assert.deepEqual((await model.generate('same prompt',key,{env:modelEnv,fetchFn:idempotent})).data,good);
 assert.equal((await model.generate('same prompt',key,{env:modelEnv,fetchFn:idempotent})).error,
   'network_or_response_error');
 assert.equal(duplicateHTTP,1,'ambiguous same prompt retry must not resend');
 let deniedHTTP=0;
 const noBudget=createPreparedQuotaFetch({
  runId:'45077365233',stage:'w01-model-en',
  maxModelTokensByProvider:{groq:4500}, // output-only is insufficient
  reserve:async()=>{throw Error('should not reserve without conservative total tokens')},
  fetchFn:async()=>{deniedHTTP++;return {};}
 });
 assert.equal((await model.generate('test',key,{env:modelEnv,fetchFn:noBudget})).error,
  'network_or_response_error');
 assert.equal(deniedHTTP,0);
 await assert.rejects(()=>noBudget('https://untrusted.example/collect',
   {method:'POST',body:'{}'}),e=>e instanceof QuotaPreflightError&&e.code==='unrecognized_request');
 const offline=createPreparedQuotaFetch({
  runId:'45077365233',stage:'w01-discovery',
  reserve:async()=>{throw Error('DB offline')},
  fetchFn:async()=>{deniedHTTP++;return {};}
 });
 const exa=search.providerRequest('exa','fake','query',1);
 await assert.rejects(()=>offline(exa.url,{method:'POST',body:JSON.stringify(exa.body)}),
  e=>e.code==='reservation_unavailable');
 assert.equal(deniedHTTP,0,'no verified reservation = no outbound network request');
 assert.throws(()=>createPreparedQuotaFetch({runId:'45077365233',stage:'w01',fetchFn:()=>{}}),
  e=>e.code==='atomic_reservation_unavailable');
 console.log('PASS prepared quota preflight: stable payload-derived keys, retry blocked, missing budget/DB/endpoint fail-closed');
})().catch(e=>{console.error(e);process.exitCode=1});
