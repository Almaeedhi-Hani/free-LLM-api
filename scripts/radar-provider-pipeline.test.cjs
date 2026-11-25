'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const adapter=require('../src/lib/provider-search.cjs');
const {RADAR_QUERIES}=require('../.market-test-build/radar-query-plan.js');
const {buildQueryMemory,buildCompetitorMatrix}=require('../.market-test-build/radar-memory.js');
const {calculateRadarMetrics}=require('../.market-test-build/radar-metrics.js');
const discoverySource=fs.readFileSync('src/lib/market/discovery.ts','utf8');
assert(discoverySource.includes("rank_status: 'unverified_provider_order'"),'Discovery must not claim verified Google rank');
assert(discoverySource.includes('rank: null,'),'Unverified provider order must not be saved as search ranking');
assert(discoverySource.includes('url: retainEvidence ? r.url : undefined,'),'Permitted provider evidence URL must be retained for page inspection');
assert(discoverySource.includes("source.id !== 'brave-search'"),'Brave Search results must not be persisted');
const env={EXA_API_KEY:'fixture',TAVILY_API_KEY:'fixture',PARALLEL_API_KEY:'fixture',FIRECRAWL_API_KEY:'fixture'};
const queries=['ar','en','zh'].map(language=>({language,query:RADAR_QUERIES[language][0].query}));
const fixtures={
 exa:[{url:'https://alpha.example/ar',title:'Saudi company setup',description:'Company formation services'},{url:'https://misa.gov.sa',title:'Official portal'}],
 tavily:[{url:'https://beta.example/en',title:'Company formation consultancy'},{url:'https://alpha.example/en',title:'Business registration'}],
 parallel:[{url:'https://gamma.example/zh',title:'沙特公司注册服务'},{url:'https://beta.example/zh',title:'沙特投资服务'}]
};
(async()=>{
 let calls=0;
 const out=await adapter.search({queries,env,maxCalls:3,maxResults:10,fetchFn:async(url)=>{
  calls++;
  const provider=url.includes('exa.ai')?'exa':url.includes('tavily')?'tavily':url.includes('parallel.ai')?'parallel':'firecrawl';
  assert.notEqual(provider,'firecrawl','Reserve fallback provider');
  return {ok:true,status:200,json:async()=>({results:fixtures[provider]})};
 }});
 assert.equal(calls,3);
 assert.deepEqual(out.diagnostics.map(x=>x.language),['ar','en','zh']);
 assert.deepEqual(out.diagnostics.map(x=>x.provider),['exa','tavily','parallel']);
 assert.equal(out.results.length,5,'Preserve one evidence result per domain and language');
 assert.ok(out.results.every(x=>x.verification==='candidate'),'Search output is unverified candidates, not confirmed competitors');
 assert.ok(out.results.every(x=>x.rank===null&&x.rank_status==='unverified_provider_order'),'Provider order must never be presented as verified SERP position');
 assert.ok(out.results.every(x=>x.url&&x.title&&x.query&&x.source),'Evidence fields preserved');
 assert.ok(!out.results.some(x=>x.domain.endsWith('.gov.sa')),'Official sites excluded');
 const competitors=new Map();
 for(const result of out.results)competitors.set(result.domain,{id:result.domain,domain:result.domain,status:'candidate'});
 const observed_at='2026-11-15T12:00:00.000Z';
 const observations=out.results.map((r,i)=>({competitor_id:r.domain,language:r.language,query:r.query,url:r.url,title:r.title,snippet:r.snippet,rank:i+1,observed_at,raw:{provider:r.source,verification:r.verification}}));
 const memory=buildQueryMemory(observations,new Date(observed_at));
 const matrix=buildCompetitorMatrix(observations);
 const metrics=calculateRadarMetrics(observations,out.diagnostics.map(d=>({source_id:d.provider,language:d.language,response_received:d.http_status===200,results_parsed:d.results,results_accepted:d.added,blocked_detected:false,failure_reason:''})));
 assert.equal(competitors.size,3);
 assert.equal(matrix.length,3);
 assert.equal(metrics.unique_competitors,3);
 assert.equal(metrics.unique_queries,3);
 assert.equal(metrics.results_accepted,5);
 assert.ok(memory,'Query memory created');
 assert.deepEqual(matrix.find(x=>x.competitor_id==='alpha.example').languages,['ar','en']);
 assert.deepEqual(matrix.find(x=>x.competitor_id==='beta.example').languages,['en','zh']);
 console.log('PASS provider -> candidate evidence -> query memory -> competitor matrix -> metrics (isolated, no DB writes)');
})().catch(e=>{console.error(e);process.exitCode=1});
