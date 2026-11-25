'use strict';
// Synthetic API checks only. NO GEO writes, no publication, no automatically paid models.
// OpenRouter candidates are filtered from the live catalog by $0 input AND output price.
// NVIDIA candidates are manually verified as NVIDIA Build "Free Endpoint: Available".
// NVIDIA Developer Program endpoints are intended for prototyping, not assured commercial quota.
const fs=require('node:fs');
const PROVIDERS={
 nvidia:{secret:'NVIDIA_API_KEY',endpoint:'https://integrate.api.nvidia.com/v1/chat/completions',
  models:['nvidia/nemotron-3.5-lightning-30b-a3b','nvidia/nemotron-3.5-super-vl-120b-a12b']},
 openrouter:{secret:'OPENROUTER_API_KEY',endpoint:'https://openrouter.ai/api/v1/chat/completions',
  catalog:'https://openrouter.ai/api/v1/models',maxModels:3}
};
const TEST_PROMPT=[
 'Synthetic model capability test: NO real investment facts or legal advice.',
 'Return JSON ONLY with exactly these keys:',
 '"ar": one natural Arabic sentence saying the investor should verify the activity;',
 '"en": one English sentence with the same meaning;',
 '"zh": one Simplified Chinese sentence with the same meaning;',
 '"goals": array of ONE object {"title":"Review published requirements","priority":"medium"};',
 '"opportunities": [], "drafts": [], "editorial_actions": [].',
 'No markdown, no invented statistics, fees, approvals, links, citations or sources.'
].join(' ');
const {freeOpenRouterModels}=require('../src/lib/geo-free-review-provider.cjs');
function responseText(payload){
 const c=payload?.choices?.[0]?.message?.content;
 if(typeof c==='string')return c;
 if(Array.isArray(c))return c.filter(x=>x?.type==='text').map(x=>x.text).join('');
 return '';
}
function capability(text){
 const fail={json:false,multilingual:false,geo_schema:false,priority:false};
 if(typeof text!=='string'||text.length>20000)return fail;
 const clean=text.trim().replace(/^\x60{3}(?:json)?\s*/i,'').replace(/\s*\x60{3}$/,'');
 let data;
 try{data=JSON.parse(clean)}catch{
  const a=clean.indexOf('{'),b=clean.lastIndexOf('}');
  if(a>=0&&b>a){try{data=JSON.parse(clean.slice(a,b+1))}catch{}}
 }
 if(!data||typeof data!=='object'||Array.isArray(data))return fail;
 const multilingual=typeof data.ar==='string'&&/[\u0600-\u06ff]/.test(data.ar)&&
  typeof data.en==='string'&&/[a-z]{4}/i.test(data.en)&&
  typeof data.zh==='string'&&/[\u3400-\u9fff]/.test(data.zh);
 const geo_schema=['opportunities','goals','drafts','editorial_actions'].every(k=>Array.isArray(data[k]));
 const priority=geo_schema&&data.goals.length===1&&
  typeof data.goals[0]?.title==='string'&&data.goals[0].title.trim().length>=3&&
  ['low','medium','high'].includes(data.goals[0]?.priority);
 return {json:true,multilingual,geo_schema,priority};
}
function statusClass(status){
 return ({401:'auth_error',402:'credits_required',403:'permission_denied',404:'model_not_found',
  410:'deprecated',429:'rate_limited'})[status]||(status>=500?'provider_error':status>=400?'http_error':'ok');
}
async function limitedJSON(response){
 const body=await response.text();
 if(body.length>120000)throw Error('oversize_response');
 return JSON.parse(body);
}
async function getRouterCatalog(fetchFn,secret){
 try{
  const response=await fetchFn(PROVIDERS.openrouter.catalog,{
   method:'GET',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {models:[],status:statusClass(response.status)};
  // The catalog contains thousands of entries; it is much larger than any
  // individual completion body. Cap at 8 MB, not the 120 KB completion limit.
  const body=await response.text();
  if(body.length>8_000_000)return {models:[],status:'catalog_oversize'};
  const payload=JSON.parse(body);
  return {models:freeOpenRouterModels(payload?.data),status:'ok'};
 }catch(e){return {models:[],status:e?.name==='TimeoutError'?'catalog_timeout':'catalog_unavailable'}}
}
async function probe(fetchFn,id,model,secret){
 const config=PROVIDERS[id],start=Date.now();
 const body={model,messages:[
  {role:'system',content:'Return only the requested synthetic JSON, no prose outside JSON.'},
  {role:'user',content:TEST_PROMPT}],max_tokens:850,temperature:0.1,stream:false};
 if(id==='nvidia')body.chat_template_kwargs={enable_thinking:false};
 const headers={Authorization:'Bearer '+secret,'Content-Type':'application/json'};
 if(id==='openrouter'){
  headers['HTTP-Referer']='https://free-llm-api-1-didl.onrender.com';
  headers['X-Title']='GEO free-provider synthetic capability check';
 }
 try{
  const response=await fetchFn(config.endpoint,{method:'POST',headers,body:JSON.stringify(body),
   signal:AbortSignal.timeout(55000)});
  const elapsed_ms=Date.now()-start;
  if(!response.ok)return {provider:id,model,outcome:statusClass(response.status),
   http_status:response.status,elapsed_ms};
  let payload;
  try{payload=await limitedJSON(response)}catch{
   return {provider:id,model,outcome:'invalid_response',elapsed_ms};
  }
  const checks=capability(responseText(payload));
  return {provider:id,model,outcome:Object.values(checks).every(Boolean)?'pass':'partial',
   actual_model:typeof payload.model==='string'?payload.model.slice(0,110):null,
   elapsed_ms,checks,usage:payload.usage?{
    prompt_tokens:payload.usage.prompt_tokens??null,
    completion_tokens:payload.usage.completion_tokens??null}:null};
 }catch(e){return {provider:id,model,outcome:
  e?.name==='TimeoutError'||e?.name==='AbortError'?'timeout':'network_error',
  elapsed_ms:Date.now()-start}}
}
async function run({env=process.env,fetchFn=fetch}={}){
 const out={date:new Date().toISOString(),test:'synthetic multilingual JSON with GEO schema',
  no_production_writes:true,no_paid_model_auto_fallback:true,results:[],catalog:null};
 for(const [id,config] of Object.entries(PROVIDERS)){
  const secret=env[config.secret];
  if(!secret){out.results.push({provider:id,outcome:'missing_credential'});continue}
  let models=config.models;
  if(id==='openrouter'){
   const cat=await getRouterCatalog(fetchFn,secret);
   out.catalog={provider:id,status:cat.status,zero_price_free_ids:cat.models};
   models=cat.models;
   if(!models.length)out.results.push({provider:id,outcome:'no_verified_free_catalog_models'});
  }
  for(const model of models){
   const result=await probe(fetchFn,id,model,secret);
   out.results.push(result);
   console.log('[MODEL_CHECK]',JSON.stringify(result));
  }
 }
 const used=out.results.filter(x=>x.model);
 out.summary={tested:used.length,passed:used.filter(x=>x.outcome==='pass').length,
  partial:used.filter(x=>x.outcome==='partial').length,
  blocked:used.filter(x=>x.outcome!=='pass'&&x.outcome!=='partial').length};
 console.log('[PROBE_SUMMARY]',JSON.stringify(out.summary));
 return out;
}
if(require.main===module){
 run().then(report=>{
  fs.mkdirSync('market-intel',{recursive:true});
  fs.writeFileSync('market-intel/model-capability-smoke.json',JSON.stringify(report,null,2));
  if(process.env.GITHUB_STEP_SUMMARY){
   const rows=report.results.map(x=>'| '+x.provider+' | '+(x.model||'-')+' | '+x.outcome+
    ' | '+(x.elapsed_ms??'-')+' | '+(x.checks?Object.values(x.checks).every(Boolean)?'yes':'partial':'-')+' |').join('\n');
   fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n## GEO free-provider capability smoke (NO production writes)\n'+
    '| Provider | Model | Result | Milliseconds | Trilingual JSON + GEO schema |\n'+
    '|---|---|---|---:|---|\n'+rows+'\n');
  }
  if(report.summary.passed===0)process.exitCode=1;
 }).catch(e=>{console.error('[PROBE_ERROR]',e?.name||'unknown');process.exitCode=1});
}
module.exports={PROVIDERS,freeOpenRouterModels,capability,statusClass,probe,run};
