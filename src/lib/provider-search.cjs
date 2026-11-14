'use strict';
// Shared server-side, credential-gated market search adapter for Next.js radar + OpenCode.
// A provider is attempted only on insufficient results or error; never query all providers
// on every run. No implicit spending, DB writes, scheduling, or publishing.
const ORDER=['exa','tavily','parallel','firecrawl'];
const KEYS={exa:'EXA_API_KEY',tavily:'TAVILY_API_KEY',parallel:'PARALLEL_API_KEY',firecrawl:'FIRECRAWL_API_KEY'};
const ENDPOINTS={
 exa:'https://api.exa.ai/search',tavily:'https://api.tavily.com/search',
 parallel:'https://api.parallel.ai/v1/search',firecrawl:'https://api.firecrawl.dev/v2/search'
};
const LIMITS={maxCalls:3,maxPerProvider:1,maxResults:10,timeoutMs:9000,maxQueries:3};
function host(raw){
 try{const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;
  const name=u.hostname.toLowerCase().replace(/^www\./,'');
  if(!name.includes('.')||name.endsWith('.gov.sa')||name.endsWith('.edu.sa')||/(^|\.)(youtube|facebook|instagram|linkedin|wikipedia|google|bing|duckduckgo|x)\.com$/.test(name))return null;
  u.hash='';return {url:u.toString(),domain:name};
 }catch{return null}
}
function safeResults(raw,provider,query,language){
 const list=Array.isArray(raw)?raw:[];const used=new Set(),out=[];
 for(const item of list){
  const entry=host(item?.url);if(!entry||used.has(entry.domain))continue;
  const title=String(item?.title||'').replace(/<[^>]+>/g,' ').trim().slice(0,250);
  if(!title)continue;
  used.add(entry.domain);
  out.push({...entry,title,snippet:String(item?.description||item?.content||item?.excerpt||item?.text||'').slice(0,500),
   query,language,source:provider,collected_at:new Date().toISOString(),verification:'candidate'});
 }
 return out;
}
function providerRequest(provider,key,query,count){
 const headers={'content-type':'application/json'};
 if(provider==='exa'){headers['x-api-key']=key;return{url:ENDPOINTS.exa,headers,body:{query,type:'auto',numResults:count}}}
 if(provider==='tavily'){headers.Authorization='Bearer '+key;return{url:ENDPOINTS.tavily,headers,body:{query,search_depth:'basic',max_results:count,include_answer:false,include_raw_content:false}}}
 if(provider==='parallel'){headers['x-api-key']=key;return{url:ENDPOINTS.parallel,headers,body:{objective:'Find official company websites for providers of the following services: '+query,search_queries:[query],mode:'turbo',advanced_settings:{max_results:count,excerpt_settings:{max_chars_per_result:400}}}}}
 if(provider==='firecrawl'){headers.Authorization='Bearer '+key;return{url:ENDPOINTS.firecrawl,headers,body:{query,limit:count,sources:[{type:'web'}]}}}
 throw Error('unsupported_provider');
}
function decode(provider,payload){
 if(provider==='exa'||provider==='tavily'||provider==='parallel')return payload?.results||[];
 if(provider==='firecrawl')return Array.isArray(payload?.data)?payload.data:payload?.data?.web||[];
 return [];
}
function configured(env=process.env){return ORDER.filter(p=>String(env[KEYS[p]]||'').trim().length>0)}
async function search({queries,env=process.env,fetchFn=fetch,maxCalls=LIMITS.maxCalls,maxResults=LIMITS.maxResults,timeoutMs=LIMITS.timeoutMs,providers=ORDER}={}){
 const terms=(Array.isArray(queries)?queries:[]).slice(0,LIMITS.maxQueries).filter(q=>q&&typeof q.query==='string'&&q.query.trim()&&['ar','en','zh'].includes(q.language));
 const configuredProviders=providers.filter(p=>ORDER.includes(p)&&String(env[KEYS[p]]||'').trim());
 const callLimit=Math.min(LIMITS.maxCalls,Math.max(0,Number(maxCalls)||0)), target=Math.min(LIMITS.maxResults,Math.max(1,Number(maxResults)||1));
 const found=[],seen=new Set(),diagnostics=[],attempts={},tried=new Set();
 // One query per language, with failover. Rotate starting provider per language
 // to distribute the bounded free-tier load among configured sources.
 for(let i=0;i<terms.length&&diagnostics.length<callLimit&&found.length<target;i++){
  const q=terms[i];let languageHasResults=false;
  const rotation=configuredProviders.length?i%configuredProviders.length:0;
  const preference=configuredProviders.slice(rotation).concat(configuredProviders.slice(0,rotation));
  for(const provider of preference){
   if(diagnostics.length>=callLimit||found.length>=target||languageHasResults)break;
   if((attempts[provider]||0)>=LIMITS.maxPerProvider)continue;
   attempts[provider]=(attempts[provider]||0)+1;
   const key=String(env[KEYS[provider]]||'').trim();
   const req=providerRequest(provider,key,q.query,Math.min(target,5));const start=Date.now();
   try{
    const response=await fetchFn(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(req.body),signal:AbortSignal.timeout(Math.min(12000,Math.max(1000,timeoutMs)))});
    let payload;try{payload=await response.json()}catch{payload=null}
    const candidates=response.ok?safeResults(decode(provider,payload),provider,q.query,q.language):[];
    let added=0;
    for(const candidate of candidates){if(seen.has(candidate.domain))continue;seen.add(candidate.domain);found.push(candidate);added++;if(found.length>=target)break}
    diagnostics.push({provider,language:q.language,http_status:response.status,results:candidates.length,added,
      duration_ms:Date.now()-start,status:response.ok?(added?'ok':'empty'):(response.status===429?'rate_limited':response.status===401||response.status===403?'auth_error':'http_error')});
    languageHasResults=added>0;
   }catch(e){diagnostics.push({provider,language:q.language,http_status:0,results:0,added:0,
     duration_ms:Date.now()-start,status:e?.name==='TimeoutError'?'timeout':'network_error'});}
  }
 }
 return {results:found,diagnostics,status:found.length?'success':'no_results',
   configured_providers:configuredProviders,request_count:diagnostics.length,request_limit:callLimit};
}
module.exports={search,configured,safeResults,providerRequest,ORDER,KEYS};
