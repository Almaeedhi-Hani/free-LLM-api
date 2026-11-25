'use strict';
const fs=require('node:fs');
const {fixtures,buildPrompt,assess}=require('./geo-semantic-review-smoke.cjs');
const {freeOpenRouterModels}=require('./geo-provider-capability-smoke.cjs');
const {parseAnswer}=require('./geo-direct-model-providers.cjs');
const ROOT='https://openrouter.ai/api/v1';
const safeId=s=>typeof s==='string'&&/^[a-zA-Z0-9_.:/ -]{1,120}$/.test(s);
async function readJson(r,max){
 if(!r.ok||!r.body||Number(r.headers.get('content-length')||0)>max)return null;
 const reader=r.body.getReader(),dec=new TextDecoder();let bytes=0,out='';
 try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max){await reader.cancel();return null}out+=dec.decode(value,{stream:true})}return JSON.parse(out+dec.decode());}
 finally{reader.releaseLock();}
}
function account(data,needed=1){
 const q=data?.free_model_daily_requests;
 if(data?.is_free_tier!==true||data?.is_management_key===true||data?.is_provisioning_key===true)return {status:'free_account_unverified'};
 if(!q||![q.used,q.limit,q.remaining].every(Number.isSafeInteger)||q.used<0||q.limit<1||q.remaining<0||q.used+q.remaining!==q.limit)return {status:'daily_quota_unverified'};
 const result={free_tier:true,limit:q.limit,remaining:q.remaining,used:q.used};
 return {...result,status:q.remaining-needed>=Math.ceil(q.limit*.2)?'verified':'reserve_protected'};
}
async function run({env=process.env,fetchFn=fetch}={}){
 const out={status:'blocked',publicationAuthorized:false,independentGatewayVerified:false,requests:0,reviewers:[],attempts:[]};
 const key=env.OPENROUTER_API_KEY;
 if(!key||typeof key!=='string')return {...out,reason:'missing_credential'};
 const raw=async(path,body)=>fetchFn(ROOT+path,{method:body?'POST':'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(body?45000:15000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const req=async(path,body,max=150000)=>readJson(await raw(path,body),max);
 try{
  out.account=account((await req('/key'))?.data,2);
  if(out.account.status!=='verified')return {...out,reason:out.account.status};
  const cat=await req('/models',null,8000000);
  // Require explicitly zero priced, text-only request candidates, not a paid
  // fallback alias; select different model authors to diversify the review.
  const ids=freeOpenRouterModels(cat?.data,100).filter(s=>safeId(s)&&s.endsWith(':free'));
  const distinct=ids.filter((id,i)=>ids.findIndex(s=>s.split('/')[0]===id.split('/')[0])===i).slice(0,3);
  if(distinct.length<2)return {...out,reason:'two_free_model_families_unavailable'};
  const cases=fixtures(),prompt=buildPrompt(cases),results=[];
  for(const model of distinct){
   if(results.length===2)break;
   const fresh=account((await req('/key'))?.data,1);
   if(fresh.status!=='verified')return {...out,reason:fresh.status};
   out.requests++;
   const attempt={model,http_status:null,status:'request_started'};
   out.attempts.push(attempt);
   const response=await raw('/chat/completions',{model,stream:false,temperature:.1,max_tokens:3000,provider:{allow_fallbacks:false,max_price:{prompt:0,completion:0},require_parameters:true},messages:[{role:'system',content:'Return only the requested synthetic JSON. Do not use tools.'},{role:'user',content:prompt}]});
   attempt.http_status=response.status;
   if(!response.ok){
    attempt.status='http_'+response.status;
    // One distinct free model may replace an unavailable upstream. Never
    // retry quota/rate, authentication, billing or ambiguous network errors.
    if([404,502,503].includes(response.status))continue;
    return {...out,reason:attempt.status};
   }
   const p=await readJson(response,150000);
   if(!p){attempt.status='invalid_response';return {...out,reason:attempt.status};}
   if(p.model!==model){attempt.status='model_identity_mismatch';return {...out,reason:attempt.status};}
   if(!safeId(p.provider)){attempt.status='provider_identity_missing';return {...out,reason:attempt.status};}
   if(p.usage?.cost!==0){attempt.status=p.usage?.cost==null?'cost_missing':'nonzero_or_invalid_cost';return {...out,reason:attempt.status};}
   const data=parseAnswer(p.choices?.[0]?.message?.content);
   out.reviewers.push({model,provider:p.provider,cost:0});
   if(!data){attempt.status='invalid_model_response';return {...out,reason:attempt.status};}
   const provider='openrouter/'+p.provider.toLowerCase();
   if(results.some(r=>r.provider===provider)){attempt.status='same_upstream_provider';continue;}
   attempt.status='verified';
   results.push({provider,actual_model:p.model,data});
  }
  if(results.length!==2)return {...out,reason:'two_distinct_reviewers_unavailable'};
  const result=assess(cases,results);
  return {...out,status:result.status==='synthetic_pass'?'openrouter_shadow_pass':'blocked',reason:result.status,passed:result.passed,total:result.total,publicationAuthorized:false};
 }catch{return {...out,reason:'account_catalog_or_request_unavailable'};}
}
if(require.main===module)run().then(report=>{
 fs.mkdirSync('market-intel',{recursive:true});fs.writeFileSync('market-intel/openrouter-account-benchmark.json',JSON.stringify(report,null,2));
 console.log('[OPENROUTER_ACCOUNT_BENCHMARK]',JSON.stringify(report));
 if(report.status!=='openrouter_shadow_pass')process.exitCode=1;
}).catch(()=>{console.error('openrouter_benchmark_failed');process.exitCode=1;});
module.exports={account,run};
