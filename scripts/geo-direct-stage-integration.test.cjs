'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
(async()=>{
 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const start=runner.indexOf('async function stageGeoAnalysis()');
 const end=runner.indexOf('\nasync function saveGEOStage(',start);
 assert(start>=0&&end>start);
 const evidence=['ar','en','zh'].flatMap(lang=>Array.from({length:8},(_,i)=>({
  language:lang,id:lang+'-'+i,type:'competitor_candidate',source:'exa'})));
 const requests=[];
 const models=['groq:openai/gpt-oss-20b','gemini:gemini-3.1-flash-lite-preview',
  'nvidia:nvidia/nvidia-nemotron-nano-9b-v2','openrouter:openrouter/free'];
 const direct={
  available:()=>models,
  generate:async(prompt,model,{timeoutMs})=>{
   const input=JSON.parse(prompt),lang=input.lang;
   requests.push({lang,model,length:input.length,timeoutMs});
   const fails=(lang==='ar'&&model===models[0])||
     (lang==='en'&&model===models[1])||(lang==='zh'&&model===models[2]);
   if(fails)return {model,error:'rate_limited'};
   return {model,data:{opportunities:[{title:lang+' evidence-based gap',type:'gap',score:30}],
    goals:[],drafts:[],editorial_actions:[]}};
  }
 };
 const scope={
  process:{env:{GEO_LLM_MODE:'direct'}},
  stageResults:{evidence:{items:evidence}},
  logStage:()=>{},
  require:p=>{
   if(p==='./geo-direct-model-providers.cjs')return direct;
   assert.equal(p,'./geo-opencode-planner.cjs');
   return {LANGS:['ar','en','zh'],
    selectLocaleEvidence:(data,lang,max)=>data.filter(e=>e.language===lang).slice(0,max),
    promptForLocale:(lang,items)=>JSON.stringify({lang,length:items.length}),
    promptForDirectLocale:(lang,items)=>JSON.stringify({lang,length:items.length})};
  }
 };
 vm.runInNewContext(runner.slice(start,end)+'\nthis.analyze=stageGeoAnalysis;',scope);
 const result=await scope.analyze();
 assert.equal(result.status,'success','three real provider outputs should permit success');
 assert.equal(result.languages_analyzed,3);
 assert.deepEqual(requests.map(x=>x.model),[
  models[0],models[1],models[1],models[2],models[2],models[3]],
 'provider rotation must skip earlier rate limits, while using successful providers');
 assert.deepEqual(requests.map(x=>x.lang),['ar','ar','en','en','zh','zh']);
 assert.deepEqual(requests.map(x=>x.length),[8,4,8,4,8,4]);
 assert.equal(scope.stageResults.geo_analysis.opportunities.length,3);
 for(const lang of ['ar','en','zh'])assert.equal(scope.stageResults.geo_analysis.languages[lang].status,'analyzed');
 // A fully unconfigured direct path must fail closed without invoking the old OpenCode CLI.
 const none={...scope,
  stageResults:{evidence:{items:evidence}},
  require:p=>p==='./geo-direct-model-providers.cjs'?{available:()=>[],generate:()=>{throw Error('no call allowed')}}:scope.require(p)};
 vm.runInNewContext(runner.slice(start,end)+'\nthis.analyze=stageGeoAnalysis;',none);
 const empty=await none.analyze();
 assert.equal(empty.status,'partial');
 assert.equal(empty.languages_analyzed,0);
 assert.equal(none.stageResults.geo_analysis.opportunities.length,0);
 console.log('PASS GEO four-provider failover across AR/EN/ZH, bounded requests, honest no-provider partial');
})().catch(e=>{console.error(e);process.exitCode=1});
