'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

(async()=>{
 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const start=runner.indexOf('async function stageGeoAnalysis()');
 const end=runner.indexOf('\nasync function saveGEOStage(',start);
 assert(start>=0&&end>start,'load the real GEO analysis stage, not a copy of the algorithm');
 const inputs=['ar','en','zh'].flatMap(language=>
  Array.from({length:8},(_,index)=>({language,id:language+'-'+index,type:index%2?'competitor_candidate':'observation',source:'mock'})));
 const requests=[];
 const planner={
  LANGS:['ar','en','zh'],
  selectLocaleEvidence:(items,lang,max)=>items.filter(item=>item.language===lang).slice(0,max),
  promptForLocale:(lang,sample)=>JSON.stringify({lang,evidence_count:sample.length})
 };
 const stageResults={evidence:{items:inputs}};
 const scope={
  stageResults,logStage:()=>{},
  require:module=>{
   assert.equal(module,'./geo-opencode-planner.cjs');
   return planner;
  },
  FALLBACK_MODELS:['opencode/beam-free','opencode/big-pickle','opencode/glm-5.3-flash-free'],
  runOpenCode:(prompt,model)=>{
   const info=JSON.parse(prompt);
   requests.push({...info,model});
   if((info.lang==='en'&&model==='opencode/beam-free')||
      (info.lang==='ar'&&model==='opencode/big-pickle'&&info.evidence_count===4)){
    return {data:{
     opportunities:[{title:info.lang+' supported proposal',type:'content',score:42}],
     goals:[],drafts:[],editorial_actions:[]
    },model};
   }
   return {error:'timeout',model};
  }
 };
 vm.runInNewContext(runner.slice(start,end)+'\nthis.analyze=stageGeoAnalysis;',scope);
 const outcome=await scope.analyze();
 assert.equal(outcome.status,'partial','a failed locale must not silently become success');
 assert.equal(outcome.languages_analyzed,2);
 assert.equal(stageResults.geo_analysis.languages.ar.status,'analyzed');
 assert.equal(stageResults.geo_analysis.languages.en.status,'analyzed');
 assert.equal(stageResults.geo_analysis.languages.zh.status,'model_unavailable');
 assert.equal(stageResults.geo_analysis.languages.zh.attempts.length,3,'retain all failed free-model attempt reasons');
 assert.equal(stageResults.geo_analysis.opportunities.length,2,'do not fabricate proposals for missing language');
 const arabic=requests.filter(r=>r.lang==='ar');
 const english=requests.filter(r=>r.lang==='en');
 const chinese=requests.filter(r=>r.lang==='zh');
 assert.equal(arabic.length,2,'stop fallback after an Arabic result');
 assert.equal(arabic[0].evidence_count,8);
 assert.equal(arabic[1].evidence_count,4,'second free model gets a compact, locale-grounded brief');
 assert.equal(english.length,1,'successful first model avoids unnecessary calls');
 assert.equal(chinese.length,3,'three models maximum, even if all fail');
 assert.equal(chinese[0].evidence_count,8);
 assert(chinese.slice(1).every(r=>r.evidence_count===4));
 assert(requests.every(r=>r.model.startsWith('opencode/')),'no paid-tier fallback in this test');
 assert(runner.includes('result.suggestions.length>0'),'zero authentic keywords cannot report full discovery success');
 console.log('PASS compact free-model fallback and truthful locale-level partial status: full 8-item primary, 4-item retry, bounded free models, no fabricated locale output');
})().catch(error=>{console.error(error);process.exitCode=1});
