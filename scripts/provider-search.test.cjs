'use strict';
const assert=require('node:assert/strict');
const engine=require('../src/lib/provider-search.cjs');
const mk=(status,results)=>({status,ok:status>=200&&status<300,json:async()=>results});
const keys={EXA_API_KEY:'fake-exa',TAVILY_API_KEY:'fake-tavily',PARALLEL_API_KEY:'fake-parallel',FIRECRAWL_API_KEY:'fake-firecrawl'};
const queries=[{query:'company formation Saudi Arabia',language:'en'},{query:'تأسيس شركة في السعودية',language:'ar'},{query:'沙特公司注册',language:'zh'}];
(async()=>{
 let n=0,seen=[];
 const failover=await engine.search({queries:queries.slice(0,1),env:keys,maxCalls:3,fetchFn:async (url)=>{
  n++;seen.push(url);
  if(url.includes('exa.ai'))return mk(429,{});
  if(url.includes('tavily'))return mk(200,{results:[
   {url:'https://www.example.sa/setup',title:'Saudi Arabia company formation consultants'},
   {url:'https://example.sa/another',title:'Saudi company registration services'}
  ]});
  throw Error('unexpected provider');
 }});
 assert.equal(n,2);assert.equal(failover.results.length,1);
 assert.deepEqual(failover.diagnostics.map(x=>x.status),['rate_limited','ok']);
 assert.equal(failover.results[0].source,'tavily');
 console.log('PASS 429 fallback Exa -> Tavily, normalized domain dedup');

 n=0;
 const all=await engine.search({queries,env:keys,maxCalls:3,fetchFn:async(url)=>{
   n++;
   if(url.includes('exa.ai'))return mk(200,{results:[{url:'https://ar.sa/service',title:'Saudi company formation'}]});
   if(url.includes('tavily'))return mk(200,{results:[{url:'https://en.sa/service',title:'Saudi business setup'}]});
   if(url.includes('parallel.ai'))return mk(200,{results:[{url:'https://zh.sa/service',title:'沙特公司注册'}]});
   throw Error('unexpected provider');
 }});
 assert.equal(n,3);assert.equal(all.results.length,3);
 assert.deepEqual(all.results.map(x=>x.language),['en','ar','zh']);
 assert.equal(all.request_count,3);
 console.log('PASS three languages, one provider call per language, strict 3-call budget');

 const missing=await engine.search({queries,env:{},maxCalls:3,fetchFn:async()=>{throw Error('should not call')}});
 assert.equal(missing.request_count,0);assert.equal(missing.results.length,0);
 console.log('PASS missing secrets -> zero calls');

 const fire=await engine.search({queries:queries.slice(0,1),env:{FIRECRAWL_API_KEY:'fake'},maxCalls:1,fetchFn:async()=>mk(200,{data:{web:[{url:'https://crawl.sa/formation',title:'Saudi Arabia company formation'}]}})});
 assert.equal(fire.results[0].source,'firecrawl');
 console.log('PASS Firecrawl nested data response');

 let calls=0;
 const limit=await engine.search({queries:queries.slice(0,1),env:keys,maxCalls:1,fetchFn:async()=>{calls++;return mk(503,{})}});
 assert.equal(calls,1);assert.equal(limit.request_count,1);
 console.log('PASS stopped immediately at request budget');

 const parallel=engine.providerRequest('parallel','fake','saudi company setup',4);
 assert.equal(parallel.body.mode,'turbo');
 assert.equal(parallel.body.advanced_settings.max_results,4);
 console.log('PASS Parallel turbo budget mode');
})().catch(e=>{console.error(e);process.exitCode=1});
