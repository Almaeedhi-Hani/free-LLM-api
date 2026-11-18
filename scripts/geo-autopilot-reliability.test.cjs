'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

(async()=>{
 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const start=runner.indexOf('async function stageGeoAnalysis()');
 const end=runner.indexOf('\nasync function saveGEOStage(',start);
 assert(start>0&&end>start,'run the real GEO analysis stage');
 const requests=[];
 const items=['ar','en','zh'].flatMap(lang=>Array.from({length:8},(_,i)=>({
  language:lang,id:lang+'-'+i,type:'candidate',source:i%2?'exa':'tavily'
 })));
 const output={evidence:{items}};
 const planner={
  LANGS:['ar','en','zh'],
  selectLocaleEvidence:(data,lang,count)=>data.filter(x=>x.language===lang).slice(0,count),
  promptForLocale:(lang,data)=>JSON.stringify({lang,length:data.length})
 };
 const models=['opencode/beam-free','opencode/big-pickle','opencode/glm-5.3-flash-free',
  'opencode/deepseek-v4.1-flash-free','opencode/flint-40b-free'];
 const scope={stageResults:output,logStage:()=>{},
  require:p=>{assert.equal(p,'./geo-opencode-planner.cjs');return planner},
  FALLBACK_MODELS:models,
  runOpenCode:(prompt,model,deadline)=>{
   const {lang,length}=JSON.parse(prompt);
   requests.push({lang,length,model,deadline});
   if(lang==='en'&&model===models[3]||lang==='zh'&&model===models[4]){
    return {model,data:{opportunities:[{title:lang}],goals:[],drafts:[],editorial_actions:[]}};
   }
   return {model,error:'timeout'};
  }
 };
 vm.runInNewContext(runner.slice(start,end)+'\nthis.analyze=stageGeoAnalysis;',scope);
 const outcome=await scope.analyze();
 assert.equal(outcome.status,'partial','unavailable Arabic does not turn into green status');
 assert.equal(outcome.languages_analyzed,2);
 assert.equal(output.geo_analysis.languages.ar.status,'model_unavailable');
 assert.equal(output.geo_analysis.languages.en.status,'analyzed');
 assert.equal(output.geo_analysis.languages.zh.status,'analyzed');
 assert.equal(output.geo_analysis.opportunities.length,2);
 assert.deepEqual(requests.filter(x=>x.lang==='ar').map(x=>x.model),models.slice(0,3));
 assert.deepEqual(requests.filter(x=>x.lang==='en').map(x=>x.model),[models[3]],'skip all failed prior providers for English');
 assert.deepEqual(requests.filter(x=>x.lang==='zh').map(x=>x.model),[models[4]],
  'use the remaining fresh free model, rather than re-timeout earlier providers');
 assert.deepEqual(requests.filter(x=>x.lang==='ar').map(x=>x.length),[8,4,2]);
 assert.deepEqual(requests.filter(x=>x.lang==='ar').map(x=>x.deadline),[90000,60000,45000]);
 assert.equal(requests.filter(x=>x.lang==='zh')[0].deadline,90000);
 assert(requests.every(x=>models.includes(x.model)),'no paid or unapproved model fallback');
 const api=fs.readFileSync('src/app/api/geo/discovery/route.ts','utf8');
 assert(api.includes("if(existing.has(normalized)){existingKeywords++;return;}"),
  'existing search terms are explicitly counted without mutating curated records');
 assert(api.includes('insertedKeywords++;')&&api.includes('keyword_persistence:{inserted:insertedKeywords,existing:existingKeywords}'),
  'insert counts must be server-observed and explicitly returned');
 assert(runner.includes('new_discovery_keywords=stageResults.discovery?.new_keywords??null'),
  'unknown keyword insert counts are nullable, not silently fabricated as zero');
 assert(runner.includes("' | locales='+localeSummary"),'saved agent status contains locale results');
 const admin=fs.readFileSync('src/app/api/admin/geo-engine/route.ts','utf8');
 const ui=fs.readFileSync('src/components/GeoEngineMonitor.tsx','utf8');
 assert(admin.includes("const stored=await getContent().catch(()=>null);"),
  'authenticated dashboard must read the persisted agent run summary');
 assert(ui.includes('حالة اللغات في آخر تحليل محفوظ'),'dashboard language status must be displayed');
 console.log('PASS free-model adaptive fallbacks, per-locale truthful reporting, server-confirmed keyword inserts/reuse and dashboard view');
})().catch(e=>{console.error(e);process.exitCode=1});
