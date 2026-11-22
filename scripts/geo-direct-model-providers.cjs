'use strict';
// Direct provider HTTP inference for the research-only GEO pipeline.
// Credential-gated bounded calls; no provider auto-discovery or paid-model fallback.
// An API key alone does not prove the associated account is on a free plan.
// Prefer high *verified* no-charge account quotas, not discontinued models:
// Groq active GPT-OSS-20B Free: up to 1K requests/day, 200K tokens/day.
// Gemini Flash-Lite: published free-tier pricing, account/project limits vary.
// NVIDIA NIM: developer preview access, quota and model availability vary.
// OpenRouter free router: normally 50 requests/day without credit purchases.
const PROVIDERS=Object.freeze([
 {id:'groq',key:'GROQ_API_KEY',model:'openai/gpt-oss-20b',
  endpoint:'https://api.groq.com/openai/v1/chat/completions'},
 {id:'gemini',key:'GEMINI_API_KEY',model:'gemini-3.1-flash-lite-preview',
  endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent'},
 {id:'nvidia',key:'NVIDIA_API_KEY',model:'nvidia/nvidia-nemotron-nano-9b-v2',
  endpoint:'https://integrate.api.nvidia.com/v1/chat/completions'},
 {id:'openrouter',key:'OPENROUTER_API_KEY',model:'openrouter/free',
  endpoint:'https://openrouter.ai/api/v1/chat/completions'}
]);
const MAX_PROMPT_CHARS=75000, MAX_RESPONSE_CHARS=180000;
const REQUIRED=['opportunities','goals','drafts','editorial_actions'];
function available(env=process.env){
 return PROVIDERS.filter(p=>typeof env[p.key]==='string'&&env[p.key].trim().length>0)
  .map(p=>p.id+':'+p.model);
}
function safeContent(value){
 if(typeof value==='string')return value;
 if(Array.isArray(value))return value.filter(x=>x?.type==='text'&&typeof x.text==='string').map(x=>x.text).join('');
 return '';
}
function parseAnswer(text){
 if(typeof text!=='string'||text.length>MAX_RESPONSE_CHARS)return null;
 const cleaned=text.trim().replace(/^\x60{3}(?:json)?\s*/i,'').replace(/\s*\x60{3}$/,'');
 let parsed;
 try{parsed=JSON.parse(cleaned);}
 catch{
  const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
  if(start<0||end<=start)return null;
  try{parsed=JSON.parse(cleaned.slice(start,end+1))}catch{return null}
 }
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
 if(!REQUIRED.every(k=>Array.isArray(parsed[k])))return null;
 for(const k of REQUIRED)if(parsed[k].length>30)return null;
 return Object.fromEntries(REQUIRED.map(k=>[k,parsed[k]]));
}
function requestSpec(provider,prompt,key){
 const headers={'content-type':'application/json'};
 if(provider.id==='gemini'){
  headers['x-goog-api-key']=key;
  return {url:provider.endpoint,headers,body:{
   contents:[{role:'user',parts:[{text:prompt}]}],
   generationConfig:{temperature:0.2,responseMimeType:'application/json',maxOutputTokens:6000}
  }};
 }
 headers.authorization='Bearer '+key;
 if(provider.id==='openrouter'){
  headers['HTTP-Referer']='https://free-llm-api-1-didl.onrender.com';
  headers['X-Title']='Invest in Saudi GEO Intelligence';
 }
 const body={model:provider.model,
  messages:[{role:'system',content:'Return only a single JSON object with opportunities, goals, drafts, editorial_actions arrays. Never invent evidence, legal certainty, statistics, or sources.'},
   {role:'user',content:prompt}],
  temperature:0.2,stream:false};
 if(provider.id==='groq'){
  // Free GPT-OSS 20B supports JSON Object Mode. Keep reasoning out of output
  // to avoid spending the limited free tokens on thoughts rather than JSON.
  body.response_format={type:'json_object'};
  body.reasoning_format='hidden';
  body.reasoning_effort='low';
  body.max_completion_tokens=4500;
 }else{
  body.max_tokens=4500;
 }
 return {url:provider.endpoint,headers,body};
}
function errorName(status){
 if(status===429)return 'rate_limited';
 if(status===402)return 'quota_exhausted';
 if(status===401||status===403)return 'auth_error';
 if(status===404||status===410)return 'model_unavailable';
 return status>=500?'provider_unavailable':'http_'+status;
}
async function generate(prompt,selected,{env=process.env,fetchFn=fetch,timeoutMs=60000}={}){
 const provider=PROVIDERS.find(p=>p.id+':'+p.model===selected);
 if(!provider)return {error:'model_not_allowlisted',model:selected};
 const key=env[provider.key];
 if(typeof key!=='string'||!key.trim())return {error:'provider_not_configured',model:selected};
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>MAX_PROMPT_CHARS)
  return {error:'invalid_prompt_size',model:selected};
 const request=requestSpec(provider,prompt,key.trim());
 // No retry or dynamic URL; fixed HTTPS allowlist only. No secrets in logs.
 try{
  const response=await fetchFn(request.url,{
   method:'POST',headers:request.headers,body:JSON.stringify(request.body),
   signal:AbortSignal.timeout(Math.min(90000,Math.max(1000,timeoutMs)))
  });
  if(!response.ok)return {error:errorName(response.status),model:selected};
  const payload=await response.json();
  const answer=provider.id==='gemini'
   ?(payload?.candidates?.[0]?.content?.parts||[]).filter(p=>typeof p.text==='string').map(p=>p.text).join('')
   :safeContent(payload?.choices?.[0]?.message?.content);
  const data=parseAnswer(answer);
  if(!data)return {error:'invalid_model_response',model:selected};
  return {data,model:selected,provider:provider.id};
 }catch(e){
  // A trusted, prepared quota preflight may refuse before HTTP. Do not turn
  // exhausted/duplicate/unverified reservations into generic network errors.
  // Without an injected preflight, the original runtime behavior is unchanged.
  const quotaCodes=['quota_reached','unconfigured','duplicate_reservation',
   'reservation_unavailable','reservation_unverified','verified_model_token_budget_missing',
   'stable_attempt_missing','unrecognized_request'];
  const error=e?.name==='QuotaPreflightError'&&quotaCodes.includes(e.code)
   ?e.code:e?.name==='TimeoutError'?'timeout':
    e?.name==='AbortError'?'timeout':'network_or_response_error';
  return {error,model:selected};
 }
}
module.exports={PROVIDERS,MAX_PROMPT_CHARS,available,parseAnswer,requestSpec,errorName,generate};
