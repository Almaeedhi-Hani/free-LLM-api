'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const gateway=require('./geo-direct-model-providers.cjs');
(async()=>{
 const {PROVIDERS,available,generate,parseAnswer}=gateway;
 assert.deepEqual(PROVIDERS.map(p=>p.id),['groq','gemini','nvidia','openrouter']);
 const env=Object.fromEntries(PROVIDERS.map(p=>[p.key,'fictional-key-for-tests-'+p.id]));
 const ids=available(env);
 assert.equal(ids.length,4,'all four connected provider names should be eligible');
 assert.deepEqual(available({GEMINI_API_KEY:'test'}),['gemini:gemini-3.1-flash-lite-preview']);
 assert.deepEqual(available({}),[],'missing secrets do not fall back to paid endpoints');
 assert(PROVIDERS.every(p=>p.endpoint.startsWith('https://')));
 assert(PROVIDERS.some(p=>p.model==='openrouter/free'),'router may select only free models');
 const valid={opportunities:[{title:'test',type:'gap',score:30}],goals:[],drafts:[],editorial_actions:[]};
 const json=JSON.stringify(valid),fence=String.fromCharCode(96).repeat(3);
 assert.deepEqual(parseAnswer(json),valid);
 assert.deepEqual(parseAnswer('Some note:\n'+json),valid);
 assert.deepEqual(parseAnswer(fence+'json\n'+json+'\n'+fence),valid);
 assert.equal(parseAnswer('{"opportunities":[]}'),null,'all four response arrays required');
 assert.equal(parseAnswer('{"opportunities":[],"goals":[],"drafts":[],"editorial_actions":{}}'),null);
 assert.equal(parseAnswer('not json'),null);
 for(const provider of PROVIDERS){
  const calls=[];
  const output=provider.id==='gemini'
   ?{candidates:[{content:{parts:[{text:json}]}}]}
   :{choices:[{message:{content:json}}]};
  const fakeFetch=async(url,options)=>{
   calls.push({url,options});
   return {ok:true,status:200,json:async()=>output};
  };
  const response=await generate('PUBLIC test only',provider.id+':'+provider.model,{
   env,fetchFn:fakeFetch,timeoutMs:1200});
  assert.deepEqual(response.data,valid,provider.id+' must parse actual provider envelope');
  assert.equal(response.provider,provider.id);
  assert.equal(calls.length,1,'one request per selected provider only');
  assert.equal(calls[0].url,provider.endpoint,'request URL cannot be user controlled');
  assert(!calls[0].url.includes(env[provider.key]),'never put API key into URL');
  assert.equal(calls[0].options.method,'POST');
  const headers=calls[0].options.headers;
  if(provider.id==='gemini'){
   assert.equal(headers['x-goog-api-key'],env[provider.key]);
   assert.equal(JSON.parse(calls[0].options.body).generationConfig.responseMimeType,'application/json');
  }else{
   if(provider.id==='groq'){
    const body=JSON.parse(calls[0].options.body);
    assert.equal(body.response_format.type,'json_object','Groq explicit JSON for free tokens');
    assert.equal(body.reasoning_format,'hidden','Hide GPT-OSS reasoning, reserve free output tokens');
    assert.equal(body.reasoning_effort,'low','Keep free-tier reasoning token spending bounded');
   }
   assert.equal(headers.authorization,'Bearer '+env[provider.key]);
   assert.equal(JSON.parse(calls[0].options.body).model,provider.model);
  }
  const failures=[{status:401,name:'auth_error'},{status:402,name:'quota_exhausted'},
   {status:429,name:'rate_limited'},{status:410,name:'model_unavailable'},
   {status:503,name:'provider_unavailable'}];
  for(const failure of failures){
   const result=await generate('public',provider.id+':'+provider.model,{
    env,fetchFn:async()=>({ok:false,status:failure.status})});
   assert.equal(result.error,failure.name);
   assert(!JSON.stringify(result).includes(env[provider.key]),'never expose the secret in failure logs');
  }
 }
 const noNetwork=()=>{throw Error('unexpected request')};
 assert.equal((await generate('public','groq:openai/gpt-oss-20b',
  {env:{},fetchFn:noNetwork})).error,'provider_not_configured');
 assert.equal((await generate('public','other:paid-model',
  {env,fetchFn:noNetwork})).error,'model_not_allowlisted');
 assert.equal((await generate('X'.repeat(75001),ids[0],
  {env,fetchFn:noNetwork})).error,'invalid_prompt_size');
 assert.equal((await generate('public',ids[0],
  {env,fetchFn:async()=>({ok:true,status:200,json:async()=>({candidates:[]})})})).error,
  'invalid_model_response');
 const wf=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 for(const p of PROVIDERS)assert(wf.includes('secrets.'+p.key),'GitHub secret not wired: '+p.key);
 assert(wf.includes('GEO_LLM_MODE: direct'),'scheduled analysis must use direct providers');
 assert(!wf.includes('curl -fsSL https://opencode.ai'),'no unverified remote CLI install in schedule');
 assert(runner.includes("await direct.generate(prompt,model,{timeoutMs})"),'runner invokes direct HTTP providers');
 assert(runner.includes("if(direct&&!candidateModels.length)"),'no models is partial, never a fake success');
 assert(wf.includes("scheduled-event-slot.cjs --kind=geo"),'Saudi cadence must use nominal event time');
 console.log('PASS four direct-model provider contracts, immutable free-plan models, error handling, no secret leaks, cadence preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
