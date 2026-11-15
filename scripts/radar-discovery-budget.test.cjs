'use strict';
// Fully mocked integration: no external API calls, no production database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(process.cwd(), 'market-radar-budget-test');
process.env.NODE_ENV = 'test';
process.env.MARKET_INTEL_PATH = root;
const mi = require('../.market-test-build/market-intelligence.js');
const keys = ['EXA_API_KEY','TAVILY_API_KEY','PARALLEL_API_KEY','FIRECRAWL_API_KEY'];
const oldKeys = Object.fromEntries(keys.map(k => [k, process.env[k]]));
const originalFetch = global.fetch;
const calls = [];
let suggestions = 0;
for (const key of keys) process.env[key] = key === 'FIRECRAWL_API_KEY' ? '' : 'fake-fixture';
fs.rmSync(root, {recursive: true, force: true});
global.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.includes('suggestqueries.google.com')) {
    suggestions++;
    return {ok:true,status:200,json:async()=>['search',[]]};
  }
  calls.push(target);
  if (target.includes('api.exa.ai')) {
    return {ok:false,status:429,json:async()=>({})};
  }
  if (target.includes('api.tavily.com') || target.includes('api.parallel.ai')) {
    return {ok:true,status:200,json:async()=>({results:[{
      url:'https://firm.example/services',
      title:'Saudi company formation services for foreign investors',
      description:'Business registration and investor licensing support in Saudi Arabia',
    }]})};
  }
  throw Error('Unexpected network access: '+target);
};
(async()=>{
  const first = await mi.runDiscovery({maxCompetitors:10,maxSuggestionsPerSeed:5,triggeredBy:'test'});
  assert.equal(suggestions,3,'One suggestion request per language, not 24');
  assert.equal(first.suggestion_requests_used,3);
  assert.equal(first.suggestion_requests_limit,3);
  assert.equal(first.search_requests_limit,6);
  assert.equal(calls.length,4,'AR fallback (2 calls), EN Tavily, ZH Parallel');
  assert.ok(calls[0].includes('exa.ai') && calls[1].includes('tavily') && calls[2].includes('tavily') && calls[3].includes('parallel.ai'),'Providers must rotate per language');
  assert.ok(first.search_requests_used <= 6,'Actual paid-provider calls are capped at 6');
  assert.equal(first.search_requests_used,calls.length);
  assert.equal(first.search_queries.length,3);
  assert.deepEqual(first.search_queries.map(x=>x.language),['ar','en','zh']);
  assert.equal(first.observations_recorded,3);
  assert.equal(first.radar_metrics.unique_competitors,1);
  assert.equal(first.radar_metrics.languages_covered,3);
  assert.equal(first.radar_metrics.provider_requests,4);
  assert.equal(first.radar_metrics.evidence_coverage_percent,100);
  const firm = await mi.getCompetitor('firm.example');
  assert.deepEqual(firm.languages.sort(),['ar','en','zh'],'Existing competitor retains all discovered languages');
  const obs = await mi.listObservations(firm.id);
  assert.equal(obs.length,3);
  assert.ok(obs.every(x=>x.rank==null),'Provider display order must not become a Google rank');
  assert.ok(obs.every(x=>x.url.startsWith('https://')),'Provenance URLs remain stored');
  const run = await mi.startRun('radar','test');
  await mi.finishRun(run.id,'success',first);
  const second = await mi.runDiscovery({maxCompetitors:10,maxSuggestionsPerSeed:5,triggeredBy:'test'});
  assert.equal(second.search_queries.length,3);
  assert.ok(second.search_requests_used <= 6);
  for (const lang of ['ar','en','zh']) {
    assert.notEqual(
      first.search_queries.find(x=>x.language===lang).query,
      second.search_queries.find(x=>x.language===lang).query,
      lang+' must rotate using persisted query attempts'
    );
  }
  console.log('PASS radar discovery integration: 3 languages, 6-call limit, 3 suggestions, retry, query history, evidence and metrics');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
  global.fetch = originalFetch;
  for (const key of keys) {
    if (oldKeys[key]===undefined) delete process.env[key]; else process.env[key]=oldKeys[key];
  }
  fs.rmSync(root,{recursive:true,force:true});
});
