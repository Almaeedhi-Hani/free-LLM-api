'use strict';
const {BingRssSearchSource}=require('../.market-test-build/open-search-sources.js');
const {RADAR_QUERIES}=require('../.market-test-build/radar-query-plan.js');
(async()=>{
 const source=new BingRssSearchSource();
 const output=[];
 for(const language of ['ar','en','zh']){
   const query=RADAR_QUERIES[language][0].query;
   const results=await source.collectResults(query,language,8);
   const diagnostic=source.lastDiagnostic;
   output.push({language,query,diagnostic,domains:results.map(r=>r.domain)});
 }
 console.log(JSON.stringify({kind:'live_public_provider_smoke',read_only:true,provider:'bing-rss',checked_at:new Date().toISOString(),output},null,2));
 if(output.every(x=>x.domains.length===0)) {
   console.error('No real competitor results; smoke check inconclusive or provider unavailable.');
   process.exitCode=1;
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
