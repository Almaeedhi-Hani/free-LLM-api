'use strict';
// Isolated provider connectivity probe. One bounded API call per provider,
// without production writes, credentials in logs, or auto publishing.
const QUERY='Saudi Arabia foreign investor company formation services';
const specs=[
 {name:'exa',env:'EXA_API_KEY',url:'https://api.exa.ai/search',headers:k=>({'x-api-key':k}),body:{query:QUERY,type:'auto',numResults:3},
  extract:v=>v.results},
 {name:'tavily',env:'TAVILY_API_KEY',url:'https://api.tavily.com/search',headers:k=>({Authorization:'Bearer '+k}),body:{query:QUERY,search_depth:'basic',max_results:3,include_answer:false,include_raw_content:false},
  extract:v=>v.results},
 {name:'firecrawl',env:'FIRECRAWL_API_KEY',url:'https://api.firecrawl.dev/v2/search',headers:k=>({Authorization:'Bearer '+k}),body:{query:QUERY,limit:3,sources:[{type:'web'}]},
  extract:v=>Array.isArray(v.data)?v.data:(v.data?.web||[])}
];
(async()=>{
 const out=[];
 for (const p of specs) {
   const key=process.env[p.env];
   if(!key){out.push({provider:p.name,status:'missing_secret'});continue}
   try {
     const res=await fetch(p.url,{method:'POST',headers:{'Content-Type':'application/json',...p.headers(key)},
       body:JSON.stringify(p.body),signal:AbortSignal.timeout(12000)});
     let payload;try{payload=await res.json()}catch{payload=null}
     const data=payload&&p.extract(payload);
     const hits=Array.isArray(data)?data.filter(x=>typeof x?.url==='string' && /^https?:\/\//.test(x.url)):[];
     const sites=[...new Set(hits.map(x=>{try{return new URL(x.url).hostname}catch{return null}}).filter(Boolean))].slice(0,3);
     out.push({provider:p.name,status:res.ok?(sites.length?'ok':'no_verified_links'):'http_error',
       http_status:res.status,results:sites.length,domains:sites});
   }catch(e){out.push({provider:p.name,status:e?.name==='TimeoutError'?'timeout':'network_error'});}
 }
 const success=out.filter(x=>x.status==='ok').length;
 console.log('PROVIDER_CONNECTIVITY_SUMMARY',JSON.stringify({providers:out,working:success,total:specs.length,
   readonly:true,at:new Date().toISOString()}));
 if(success===0) process.exitCode=1;
})().catch(e=>{console.error('PROVIDER_PROBE_UNEXPECTED',e?.name||'error');process.exitCode=1});
