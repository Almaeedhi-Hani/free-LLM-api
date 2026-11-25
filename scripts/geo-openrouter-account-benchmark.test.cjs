'use strict';
const assert=require('node:assert/strict');
const {account,run}=require('./geo-openrouter-account-benchmark.cjs');
const {fixtures}=require('./geo-semantic-review-smoke.cjs');
(async()=>{
 const q={is_free_tier:true,free_model_daily_requests:{used:4,limit:50,remaining:46}};
 assert.equal(account(q,2).status,'verified');
 assert.equal(account({...q,is_free_tier:false}).status,'free_account_unverified');
 assert.equal(account({...q,free_model_daily_requests:null}).status,'daily_quota_unverified');
 assert.equal(account({...q,free_model_daily_requests:{used:40,limit:50,remaining:10}}).status,'reserve_protected');
 const models=['qwen/test-qwen:free','google/test-gemma:free','mistral/test-mistral:free'].map(id=>({id,pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']},context_length:32000,supported_parameters:['response_format']}));
 const calls=[];
 const fake=async(url,o)=>{
  calls.push({url,method:o.method});
  assert.equal(o.redirect,'error');
  if(url.endsWith('/key'))return new Response(JSON.stringify({data:q}));
  if(url.endsWith('/models'))return new Response(JSON.stringify({data:models}));
  const body=JSON.parse(o.body);
  assert.equal(body.provider.max_price.prompt,0);assert.equal(body.provider.max_price.completion,0);
  assert.equal(body.provider.allow_fallbacks,false);
  assert(!body.tools&&!body.models);
  return new Response(JSON.stringify({model:body.model,provider:body.model.split('/')[0],usage:{cost:0},choices:[{message:{content:JSON.stringify({goals:fixtures().map(c=>({packetDigest:c.packet.packetDigest,assessments:[{claim_id:'c0',verdict:c.expected,fidelity:c.expected==='supported'?'faithful':'unfaithful',passage_ids:['s0p0','s1p0']}]})),opportunities:[],drafts:[],editorial_actions:[]})}}]}));
 };
 const env={OPENROUTER_API_KEY:'fixture-secret'};
 const r=await run({env,fetchFn:fake});
 assert.equal(r.status,'openrouter_shadow_pass',JSON.stringify(r));assert.equal(r.passed,6);assert.equal(r.requests,2);
 assert.equal(r.publicationAuthorized,false);assert.equal(r.independentGatewayVerified,false);
 assert(!JSON.stringify(r).includes(env.OPENROUTER_API_KEY));
 assert.equal(calls.filter(c=>c.method==='POST').length,2);
 let attempts=0;
 const blocked=await run({env,fetchFn:async()=>{attempts++;return new Response(JSON.stringify({data:{is_free_tier:true}}));}});
 assert.equal(blocked.reason,'daily_quota_unverified');assert.equal(attempts,1);assert.equal(blocked.requests,0);
 const failOnSecond=async(status)=>{let posts=0;return run({env,fetchFn:async(url,o)=>{
  if(o.method==='POST'&&++posts===2)return new Response('{}',{status});
  return fake(url,o);
 }});};
 const fallback=await failOnSecond(503);
 assert.equal(fallback.status,'openrouter_shadow_pass',JSON.stringify(fallback));
 assert.equal(fallback.requests,3);assert.equal(fallback.attempts[1].status,'http_503');
 for(const code of [401,402,403,429]){
  const stopped=await failOnSecond(code);
  assert.equal(stopped.reason,'http_'+code);assert.equal(stopped.requests,2);
 }
 const badCost=await run({env,fetchFn:async(url,o)=>{
  const r=await fake(url,o);if(o.method!=='POST')return r;
  const p=await r.json();p.usage.cost=.001;return new Response(JSON.stringify(p));
 }});
 assert.equal(badCost.reason,'nonzero_or_invalid_cost');assert.equal(badCost.requests,1);
 const badModel=await run({env,fetchFn:async(url,o)=>{
  const r=await fake(url,o);if(o.method!=='POST')return r;
  const p=await r.json();p.model='wrong/model';return new Response(JSON.stringify(p));
 }});
 assert.equal(badModel.reason,'model_identity_mismatch');assert.equal(badModel.requests,1);
 const {reviewCandidate}=require('../src/lib/geo-openrouter-review.cjs');
 const packet=fixtures()[0].packet;
 const candidate=await reviewCandidate(packet,{env,fetchFn:async(url,o)=>{
  const r=await fake(url,o);if(o.method!=='POST')return r;
  const p=await r.json();const data=JSON.parse(p.choices[0].message.content);
  data.goals=data.goals.filter(g=>g.packetDigest===packet.packetDigest);
  p.choices[0].message.content=JSON.stringify(data);return new Response(JSON.stringify(p));
 }});
 assert.equal(candidate.status,'openrouter_shadow_pass',JSON.stringify(candidate));
 assert.equal(candidate.reviewedClaims,1);
 assert.equal(candidate.publicationAuthorized,false);assert.equal(candidate.independentGatewayVerified,false);
 assert.equal((await reviewCandidate(null,{env,fetchFn:()=>{throw Error('unexpected request')}})).reason,'official_packet_unavailable');
 console.log('PASS OpenRouter account metadata, no paid fallback, two bounded synthetic calls and zero-cost receipt');
})().catch(e=>{console.error(e);process.exitCode=1;});
