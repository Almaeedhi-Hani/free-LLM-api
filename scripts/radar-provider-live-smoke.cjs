'use strict';
const adapter=require('../src/lib/provider-search.cjs');
const {RADAR_QUERIES}=require('../.market-test-build/radar-query-plan.js');
(async()=>{
 const configured=adapter.configured();
 if(!configured.length){console.error('NO_CONFIGURED_PROVIDER: no credential-gated search providers available in this runner');process.exitCode=2;return}
 const queries=['ar','en','zh'].map(language=>({language,query:RADAR_QUERIES[language][0].query}));
 const out=await adapter.search({queries,maxCalls:3,maxResults:8,timeoutMs:9000});
 const results=out.results.map(r=>({domain:r.domain,language:r.language,source:r.source,query:r.query,url:r.url}));
 const accepted=results.filter(r=>r.domain&&!r.domain.endsWith('.gov.sa'));
 const languages=[...new Set(accepted.map(r=>r.language))];
 const report={kind:'credentialed_provider_smoke',read_only:true,checked_at:new Date().toISOString(),configured_providers:out.configured_providers,request_count:out.request_count,request_limit:out.request_limit,status:out.status,diagnostics:out.diagnostics,unique_domains:new Set(accepted.map(r=>r.domain)).size,languages_with_results:languages,results:accepted};
 console.log(JSON.stringify(report,null,2));
 if(!accepted.length){console.error('FAIL: providers returned no candidate domains');process.exitCode=1}
 else if(languages.length<2){console.error('PARTIAL: fewer than two languages returned candidates');process.exitCode=1}
})().catch(e=>{console.error(e?.message||String(e));process.exitCode=1});
