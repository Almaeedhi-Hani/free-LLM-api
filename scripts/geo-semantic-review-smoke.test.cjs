'use strict';
const assert=require('node:assert/strict');
const {fixtures,run}=require('./geo-semantic-review-smoke.cjs');
const {preflight}=require('../src/lib/provider-usage-observer.cjs');
(async()=>{
 const cases=fixtures();
 assert.equal(cases.length,6);
 assert(cases.every(c=>c.packet));
 const env={GEO_SEMANTIC_FREE_ACCOUNTS_VERIFIED:'true',GEO_API_KEY:'synthetic',GROQ_API_KEY:'synthetic',OPENROUTER_API_KEY:'synthetic'};
 const calls=[];
 const fake=async(prompt,model,opts)=>{
  calls.push(model);assert.equal(opts.strictQuota,true);assert.equal(opts.timeoutMs,45000);
  assert(!prompt.includes('GEO_API_KEY'));
  return {provider:model.split(':')[0],actual_model:model.startsWith('groq:')?'openai/gpt-oss-20b':'qwen/test-fixture:free',
   data:{goals:cases.map(c=>({packetDigest:c.packet.packetDigest,assessments:[{claim_id:'c0',verdict:c.expected,
    fidelity:c.expected==='supported'?'faithful':'unfaithful',passage_ids:['s0p0','s1p0']}]}))}};
 };
 const report=await run({env,generate:fake});
 assert.equal(report.status,'synthetic_pass');assert.equal(report.passed,6);assert.equal(report.publicationAuthorized,false);
 assert.equal(calls.length,2);
 const unverified=await run({env:{...env,GEO_SEMANTIC_FREE_ACCOUNTS_VERIFIED:'false'},generate:()=>{throw Error('unexpected request')}});
 assert.equal(unverified.reason,'free_accounts_not_verified');
 let n=0;
 const blocked=await run({env,generate:async()=>{n++;return {error:'provider_quota_cooldown'}}});
 assert.equal(blocked.status,'blocked');assert.equal(n,1);
 const bad=await run({env,generate:async(...args)=>{
  const r=await fake(...args);for(const x of r.data.goals)x.assessments[0].verdict='supported';return r;
 }});
 assert.equal(bad.status,'synthetic_failed');assert.equal(bad.publicationAuthorized,false);
 const q={provider:'groq',blocked:false,reason:'none',confirmed_daily_limit:1000,confirmed_daily_remaining:500,day_limit_evidence:'explicit_provider_response_header',history_may_be_truncated:false};
 const p=(data,ok=true)=>preflight('groq',{env,strict:true,fetchFn:async()=>({ok,json:async()=>data})});
 assert.equal((await p(q)).blocked,false);
 for(const data of [{...q,confirmed_daily_limit:null},{...q,confirmed_daily_remaining:200},{...q,history_may_be_truncated:true},{...q,day_limit_evidence:'unknown'}])assert.equal((await p(data)).blocked,true);
 assert.equal((await p(q,false)).blocked,true);
 assert.equal((await preflight('groq',{env:{},strict:true})).blocked,true);
 console.log('PASS: six trilingual synthetic cases, strict verified quota, no unverified provider calls or publication');
})().catch(e=>{console.error(e);process.exitCode=1});
