'use strict';
const assert=require('node:assert/strict');
const q=require('../src/lib/provider-usage-observer.cjs');
const now=new Date('2026-11-23T01:00:00.000Z');
const response=(status,fields={})=>({status,headers:new Headers(fields)});
(async()=>{
 assert.equal(q.PROVIDERS.length,8);
 const groq=q.makeObservation('groq',response(200,{
  'x-ratelimit-limit-requests':'14400',
  'x-ratelimit-remaining-requests':'11510',
  'x-ratelimit-reset-requests':'13h2m15s',
  'x-ratelimit-limit-tokens':'18000'
 }),{usage:{total_tokens:42}},now);
 assert.equal(groq.daily_request_limit,14400,'Groq documents RPD');
 assert.equal(groq.daily_requests_remaining,11510);
 assert.equal(groq.tokens_used,42);
 assert.equal(groq.daily_reset_seconds,46935);
 assert.equal(groq.other_rate_limit,null,'TPM is not a daily cap');
 assert.equal(Math.floor(groq.daily_request_limit*.8),11520);
 const unknown=q.makeObservation('openrouter',response(429,{
  'X-RateLimit-Limit':'50','X-RateLimit-Remaining':'0','Retry-After':'120'
 }),null,now);
 assert.equal(unknown.daily_request_limit,null,'unscoped OpenRouter limit is not daily');
 assert.equal(unknown.other_rate_limit,50);
 assert.equal(unknown.retry_after_seconds,120);
 assert.equal(unknown.http_status,429);
 const gemini=q.makeObservation('gemini',response(200),{
  usageMetadata:{promptTokenCount:10,candidatesTokenCount:15,totalTokenCount:25}},now);
 assert.equal(gemini.tokens_used,25);
 for(const p of q.PROVIDERS){
  const o=q.makeObservation(p,response(200),{usage:{prompt_tokens:4,completion_tokens:6}},now);
  if(p!=='gemini')assert.equal(o.tokens_used,10);
  assert.equal(o.daily_request_limit,null);
 }
 assert.equal(q.duration('1h3m.5s'),null,'malformed numeric duration discarded');
 assert.equal(q.duration('1h3m0.5s'),3781);
 assert.equal(q.retrySeconds(response(429,{'retry-after':'Tue, 24 Nov 2026 01:00:00 GMT'}),now.getTime()),86400);
 assert.equal(q.integer('99999999999999'),null);
 assert.throws(()=>q.makeObservation('unknown',response(200)),/Invalid provider/);
 assert.equal(q.reporterUrl({GEO_API_KEY:'key',GEO_API_URL:'https://evil.test'}),null,
  'GEO key cannot be sent to arbitrary origin');
 assert.equal(q.reporterUrl({}),null);
 let requests=[];
 const fetchFn=async(url,opts)=>{
  requests.push({url,method:opts.method,body:opts.body,secret:opts.headers['x-geo-api-key']});
  if(opts.method==='GET')return {ok:true,json:async()=>({provider:'groq',blocked:true,reason:'rate_limit_backoff'})};
  return {status:200};
 };
 const env={GEO_API_KEY:'fake-key',GITHUB_RUN_ID:'987',GEO_API_URL:q.ROOT};
 assert.equal(await q.saveObservation(groq,{env,fetchFn}),true);
 assert.equal(requests[0].url,q.ROOT+'/api/geo/provider-usage');
 const body=JSON.parse(requests[0].body);
 assert.deepEqual(Object.keys(body).sort(),['observation','run_id']);
 assert.equal(body.run_id,'987');
 assert(!requests[0].body.includes('fake-key'));
 assert.equal((await q.preflight('groq',{env,fetchFn})).blocked,true);
 assert(requests.every(x=>x.url.startsWith(q.ROOT+'/api/geo/provider-usage')));
 assert.equal((await q.preflight('exa',{env:{},fetchFn})).blocked,false);
 assert.equal((await q.preflight('evil',{env,fetchFn})).blocked,true);
 assert.equal(await q.saveObservation(groq,{env:{},fetchFn}),false);
 console.log('PASS 8 real providers, Groq RPD vs TPM scope, 429 cooldown, safe telemetry, immutable provider origin, no secret leaks, no quota guessing');
})().catch(e=>{console.error(e);process.exitCode=1});
