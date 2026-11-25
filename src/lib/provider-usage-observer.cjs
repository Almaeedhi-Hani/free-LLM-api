'use strict';
// Observe existing provider calls only. Never probe, infer an account cap from
// request counts, log prompt text, report credentials or increase usage.
const PROVIDERS=Object.freeze(['exa','tavily','parallel','firecrawl','groq','gemini','nvidia','openrouter']);
const ROOT='https://free-llm-api-1-didl.onrender.com';
const MAX=1_000_000_000;
function integer(value,max=MAX){
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const s=String(value).trim();
 if(!/^(0|[1-9]\d{0,11})$/.test(s))return null;
 const n=Number(s);return Number.isSafeInteger(n)&&n<=max?n:null;
}
function header(response,name){
 try{
  const h=response?.headers;
  if(typeof h?.get==='function')return h.get(name)||null;
  if(h&&typeof h==='object'){
   const key=Object.keys(h).find(k=>k.toLowerCase()===name.toLowerCase());
   return key?String(h[key]):null;
  }
 }catch{}
 return null;
}
function getNumber(response,names){
 for(const name of names){
  const value=integer(header(response,name));
  if(value!==null)return value;
 }
 return null;
}
function duration(value){
 if(typeof value!=='string'||value.length>55)return null;
 if(/^\d+(?:\.\d+)?$/.test(value))return Math.min(604800,Math.ceil(Number(value)));
 let sum=0,pos=0;
 for(const m of value.matchAll(/(\d+(?:\.\d+)?)(d|h|m|s)/gi)){
  if(m.index!==pos)return null;
  sum+=Number(m[1])*({d:86400,h:3600,m:60,s:1}[m[2].toLowerCase()]);
  pos+=m[0].length;
 }
 return pos===value.length&&pos>0&&Number.isFinite(sum)?Math.min(604800,Math.ceil(sum)):null;
}
function retrySeconds(response,now=Date.now()){
 const value=header(response,'retry-after');
 if(!value)return null;
 const secs=duration(value.trim());
 if(secs!==null)return secs;
 const at=Date.parse(value);
 return Number.isFinite(at)?Math.min(604800,Math.max(0,Math.ceil((at-now)/1000))):null;
}
function tokens(provider,payload){
 if(!payload||typeof payload!=='object')return null;
 const usage=provider==='gemini'?payload.usageMetadata:payload.usage;
 const n=integer(usage?.totalTokenCount??usage?.total_tokens);
 if(n!==null)return n;
 const first=integer(usage?.prompt_tokens??usage?.input_tokens);
 const second=integer(usage?.completion_tokens??usage?.output_tokens);
 return first!==null&&second!==null&&first+second<=MAX?first+second:null;
}
function makeObservation(provider,response,payload=null,now=new Date()){
 if(!PROVIDERS.includes(provider))throw Error('Invalid provider');
 const status=integer(response?.status,599)??0;
 const observedAt=now instanceof Date&&Number.isFinite(now.getTime())?now.toISOString():new Date().toISOString();
 // Groq documents x-ratelimit-limit-requests as requests/day and
 // x-ratelimit-limit-tokens as tokens/MINUTE. Never mix these scopes.
 const groq=provider==='groq';
 const dayLimit=getNumber(response,[
  'x-ratelimit-limit-day','x-daily-request-limit',
  ...(groq?['x-ratelimit-limit-requests']:[])
 ]);
 const dayRemaining=getNumber(response,[
  'x-ratelimit-remaining-day','x-daily-requests-remaining',
  ...(groq?['x-ratelimit-remaining-requests']:[])
 ]);
 const rawLimit=getNumber(response,['ratelimit-limit','x-ratelimit-limit']);
 const rawRemaining=getNumber(response,['ratelimit-remaining','x-ratelimit-remaining']);
 const retry=retrySeconds(response,now.getTime());
 const reset=groq?duration(header(response,'x-ratelimit-reset-requests')):null;
 return {
  provider,http_status:status,observed_at:observedAt,requests:1,
  tokens_used:tokens(provider,payload),
  daily_request_limit:dayLimit!==null&&dayLimit>0?dayLimit:null,
  daily_requests_remaining:dayLimit!==null&&dayRemaining!==null&&dayRemaining<=dayLimit?dayRemaining:null,
  daily_reset_seconds:reset,rate_window:'day',
  other_rate_limit:rawLimit,other_rate_remaining:rawRemaining,
  other_rate_window:'unspecified',
  retry_after_seconds:retry
 };
}
function reporterUrl(env=process.env){
 if(!env?.GEO_API_KEY||typeof env.GEO_API_KEY!=='string')return null;
 const candidate=env.GEO_API_URL||ROOT;
 try{
  const u=new URL(candidate);
  if(u.origin!==ROOT||u.username||u.password)return null;
  return ROOT+'/api/geo/provider-usage';
 }catch{return null}
}
async function saveObservation(observation,{env=process.env,fetchFn=fetch}={}){
 const url=reporterUrl(env);
 if(!url||!observation||!PROVIDERS.includes(observation.provider))return false;
 try{
  const res=await fetchFn(url,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(3500),
   headers:{'content-type':'application/json','x-geo-api-key':env.GEO_API_KEY},
   body:JSON.stringify({observation,run_id:/^\d{1,18}$/.test(String(env.GITHUB_RUN_ID||''))?
    String(env.GITHUB_RUN_ID):null})
  });
  return res.status===200;
 }catch{return false}
}
async function preflight(provider,{env=process.env,fetchFn=fetch,strict=false}={}){
 if(!PROVIDERS.includes(provider))return {blocked:true,reason:'invalid_provider'};
 const url=reporterUrl(env);
 if(!url)return {blocked:strict,reason:'monitor_unconfigured'};
 try{
  const res=await fetchFn(url+'?provider='+provider,{
   method:'GET',redirect:'error',signal:AbortSignal.timeout(3500),
   headers:{'x-geo-api-key':env.GEO_API_KEY}
  });
  if(!res.ok)return {blocked:strict,reason:'monitor_unavailable'};
  const data=await res.json();
  if(data?.provider!==provider||typeof data?.blocked!=='boolean')
   return {blocked:strict,reason:'monitor_unverified'};
  if(strict&&!data.blocked){
   const limit=data.confirmed_daily_limit,remaining=data.confirmed_daily_remaining;
   if(data.reason!=='none'||data.day_limit_evidence!=='explicit_provider_response_header'||data.history_may_be_truncated!==false||!Number.isSafeInteger(limit)||limit<=0||!Number.isSafeInteger(remaining)||remaining>limit||remaining-1<Math.ceil(limit*.20))return {blocked:true,reason:'verified_daily_budget_missing'};
  }
  return {blocked:data.blocked,reason:data.reason||'unknown'};
 }catch{return {blocked:strict,reason:'monitor_unavailable'}}
}
module.exports={PROVIDERS,ROOT,integer,duration,retrySeconds,tokens,makeObservation,
 reporterUrl,saveObservation,preflight};
