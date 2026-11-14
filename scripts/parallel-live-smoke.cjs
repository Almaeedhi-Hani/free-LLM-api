'use strict';
// Single bounded, read-only real Parallel search. Never disclose API keys or write to Supabase.
(async()=>{
 const key=process.env.PARALLEL_API_KEY;
 if(!key){console.log('PARALLEL_LIVE_PROBE',JSON.stringify({status:'missing_secret',secret_name:'PARALLEL_API_KEY',readonly:true}));return}
 const t=Date.now();
 try{
 const response=await fetch('https://api.parallel.ai/v1/search',{
  method:'POST',headers:{'x-api-key':key,'Content-Type':'application/json'},
  body:JSON.stringify({
   objective:'Find companies offering Saudi Arabian foreign investor company formation or MISA investment license advisory services, with official company website links.',
   search_queries:['Saudi company formation foreign investors','MISA license business setup services'],
   mode:'turbo',
   advanced_settings:{max_results:5,excerpt_settings:{max_chars_per_result:350}}
  }),
  signal:AbortSignal.timeout(18000)
 });
 let body=null;try{body=await response.json()}catch{}
 const hits=Array.isArray(body?.results)?body.results:[];
 const domains=[...new Set(hits.map(r=>{try{return new URL(r.url).hostname}catch{return null}}).filter(Boolean))].slice(0,5);
 const status=response.ok?(domains.length?'ok':'no_verified_links'):(response.status===401||response.status===403?'auth_error':response.status===429?'rate_limited':'http_error');
 console.log('PARALLEL_LIVE_PROBE',JSON.stringify({status,http_status:response.status,results:domains.length,domains,elapsed_ms:Date.now()-t,readonly:true}));
 if(status!=='ok')process.exitCode=1;
 }catch(e){console.log('PARALLEL_LIVE_PROBE',JSON.stringify({status:e?.name==='TimeoutError'?'timeout':'network_error',elapsed_ms:Date.now()-t,readonly:true}));process.exitCode=1}
})().catch(()=>{console.log('PARALLEL_LIVE_PROBE',JSON.stringify({status:'unexpected_error',readonly:true}));process.exitCode=1});
