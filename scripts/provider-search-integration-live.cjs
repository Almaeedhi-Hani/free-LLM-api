'use strict';
const engine=require('../src/lib/provider-search.cjs');
const fs=require('node:fs');
(async()=>{
 const queries=[
  {query:'Saudi Arabia foreign investor company formation services',language:'en'},
  {query:'خدمات تأسيس الشركات للمستثمر الأجنبي في السعودية',language:'ar'},
  {query:'沙特 外国投资 公司注册 服务',language:'zh'}
 ];
 const out=await engine.search({queries,maxCalls:3,maxResults:9});
 const result={at:new Date().toISOString(),status:out.status,configured_providers:out.configured_providers,
  request_count:out.request_count,limit:out.request_limit,diagnostics:out.diagnostics,
  candidates:out.results.map(r=>({domain:r.domain,url:r.url,language:r.language,source:r.source}))};
 fs.mkdirSync('.search-probe',{recursive:true});
 fs.writeFileSync('.search-probe/provider-integration.json',JSON.stringify(result,null,2));
 console.log('INTEGRATED_PROVIDER_SEARCH',JSON.stringify(result));
 if(out.request_count>3||out.results.length===0)process.exitCode=1;
})().catch(e=>{console.error('INTEGRATION_PROBE_FAILURE',e?.name||'unknown');process.exitCode=1});
