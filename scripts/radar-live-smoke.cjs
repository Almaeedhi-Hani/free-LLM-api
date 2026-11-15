'use strict';
const {BingRssSearchSource,DuckDuckGoHtmlSource}=require('../.market-test-build/open-search-sources.js');
const {RADAR_QUERIES}=require('../.market-test-build/radar-query-plan.js');
(async()=>{
 const sources=[new BingRssSearchSource(),new DuckDuckGoHtmlSource()];
 const output=[];
 for(const source of sources){
   for(const language of ['ar','en','zh']){
     const query=RADAR_QUERIES[language][0].query;
     const results=await source.collectResults(query,language,8);
     const diagnostic={...source.lastDiagnostic};
     output.push({provider:source.id,language,query,diagnostic,domains:results.map(r=>r.domain)});
   }
 }
 const usable=output.filter(x=>x.domains.length>0);
 const blocked=output.filter(x=>x.diagnostic.blocked_detected);
 console.log(JSON.stringify({kind:'live_public_provider_smoke',read_only:true,checked_at:new Date().toISOString(),usable_probes:usable.length,total_probes:output.length,blocked_probes:blocked.length,output},null,2));
 if(!usable.length){
   console.error('Live public search unavailable: neither Bing RSS nor DuckDuckGo HTML produced relevant competitor results. Do not promote.');
   process.exitCode=1;
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
