'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PROVIDERS,freeOpenRouterModels,capability,statusClass,probe,run}=require('./geo-provider-capability-smoke.cjs');
(async()=>{
 const entries=[
  {id:'paid/costly',pricing:{prompt:'0.00001',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']},context_length:65536},
  {id:'free/mixed:free',pricing:{prompt:'0',completion:'0.001'},architecture:{input_modalities:['text'],output_modalities:['text']},context_length:65536},
  {id:'free/vision:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['image'],output_modalities:['image']},context_length:65536},
  {id:'qwen/free-one:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']},context_length:131072,supported_parameters:['response_format']},
  {id:'qwen/free-two:free',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']},context_length:65536}
 ];
 assert.deepEqual(freeOpenRouterModels(entries),['qwen/free-one:free','qwen/free-two:free']);
 assert.equal(freeOpenRouterModels([{...entries[3],id:'paid/costly-free'}]).length,0);
 const valid=JSON.stringify({ar:'يجب على المستثمر التحقق من النشاط',en:'Investor should verify the activity',
  zh:'投资者应核实拟开展的业务',goals:[{title:'Review requirements',priority:'medium'}],
  opportunities:[],drafts:[],editorial_actions:[]});
 assert(Object.values(capability(valid)).every(Boolean));
 assert(Object.values(capability('NOT JSON')).every(x=>x===false));
 assert.equal(capability(JSON.stringify({ar:'Arabic',en:'English',zh:'Chinese',goals:[],opportunities:[],drafts:[],editorial_actions:[]})).multilingual,false);
 assert.equal(statusClass(429),'rate_limited');
 const urls=[],calls=[];
 const fake=async(url,opts)=>{
  urls.push(url);
  if(url==='https://openrouter.ai/api/v1/models')return {
   ok:true,status:200,text:async()=>JSON.stringify({data:entries})};
  calls.push(JSON.parse(opts.body));
  return {ok:true,status:200,text:async()=>JSON.stringify({
   model:calls.at(-1).model,usage:{prompt_tokens:60,completion_tokens:75},
   choices:[{message:{content:valid}}]})};
 };
 const env={NVIDIA_API_KEY:'NVIDIA_TEST_PLACEHOLDER',OPENROUTER_API_KEY:'ROUTER_TEST_PLACEHOLDER'};
 const r=await run({env,fetchFn:fake});
 assert.equal(r.results.filter(x=>x.outcome==='pass').length,4,'two NVIDIA and two verified free OpenRouter models');
 assert.equal(r.catalog.status,'ok');
 assert.equal(calls.length,4,'no duplicate paid calls or retries');
 assert(calls.slice(0,2).every(x=>x.chat_template_kwargs?.enable_thinking===false),
  'NVIDIA model must use direct answer instead of exhausting free tokens on reasoning');
 assert(calls.slice(2).every(x=>!x.chat_template_kwargs),
  'Do not send NVIDIA-specific options to OpenRouter');
 assert(calls.every(x=>x.messages.every(m=>!m.content.includes('API_KEY'))));
 assert(!JSON.stringify(r).includes(env.NVIDIA_API_KEY));
 assert(!JSON.stringify(r).includes(env.OPENROUTER_API_KEY));
 assert(urls.every(url=>Object.values(PROVIDERS).some(p=>url===p.endpoint||url===p.catalog)),
  'requests may use only fixed HTTPS provider endpoints');
 const bad=await probe(async()=>({ok:false,status:402}), 'nvidia',PROVIDERS.nvidia.models[0],env.NVIDIA_API_KEY);
 assert.equal(bad.outcome,'credits_required','never retry using a paid provider');
 const workflow=fs.readFileSync('.github/workflows/geo-provider-capability-smoke.yml','utf8');
 assert(workflow.includes("geo-provider-capability-smoke.cjs"));
 assert(workflow.includes('secrets.NVIDIA_API_KEY')&&workflow.includes('secrets.OPENROUTER_API_KEY'));
 assert(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert(!workflow.split('Run isolated semantic benchmark')[0].includes('GEO_API_KEY'));
 assert(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.semantic_review && inputs.free_accounts_verified"));
 assert(!/^  push:/m.test(workflow),'Never run credentialed capability probes just because a commit merged');
 assert(!workflow.includes('schedule:')&&!workflow.includes('geo-analysis.js'));
 assert(workflow.includes('workflow_dispatch'));
 console.log('PASS: NVIDIA and OpenRouter safe models, strict zero pricing, no writes, no secret leaks, bounded calls');
})().catch(e=>{console.error(e);process.exitCode=1});
