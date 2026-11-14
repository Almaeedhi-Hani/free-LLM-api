'use strict';
// Temporary startup-only diagnostic for Render. One request per provider.
// Sanitized status only; no credentials, response bodies or DB writes.
const engine=require('../src/lib/provider-search.cjs');
const query='Saudi Arabia company formation foreign investor services';
async function one(provider) {
 const key=String(process.env[engine.KEYS[provider]]||'').trim();
 if(!key)return{provider,status:'missing_key'};
 try {
  const spec=engine.providerRequest(provider,key,query,2);
  const res=await fetch(spec.url,{method:'POST',headers:spec.headers,body:JSON.stringify(spec.body),
    signal:AbortSignal.timeout(10000)});
  let data=null;try{data=await res.json()}catch{}
  const raw=provider==='firecrawl'?(Array.isArray(data?.data)?data.data:data?.data?.web||[]):data?.results||[];
  const results=engine.safeResults(raw,provider,query,'en');
  return {provider,status:res.ok?(results.length>0?'ok':'empty'):(res.status===429?'rate_limited':res.status===401||res.status===403?'authentication_failed':'http_error'),http_status:res.status,results:results.length};
 }catch(e){return{provider,status:e?.name==='TimeoutError'?'timeout':'network_error'}}
}
(async()=> {
 const providers=await Promise.all(engine.ORDER.map(one));
 console.log('RENDER_PROVIDER_SMOKE_RESULT',JSON.stringify({providers,working:providers.filter(p=>p.status==='ok').length,readonly:true,no_database_writes:true,no_publications:true}));
})().catch(()=>console.log('RENDER_PROVIDER_SMOKE_RESULT',JSON.stringify({status:'unexpected_error',readonly:true})));
