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

 const localeFixtures={
  ar:{q:'كيف يبدأ المستثمر التخطيط لتأسيس شركته؟',a:'تبدأ خطة التأسيس بتحديد النشاط التجاري والكيان الأنسب قبل مراجعة المتطلبات لدى الجهات المعنية.',
   title:'دليل عملي لتخطيط تأسيس شركة أجنبية',summary:'تعرف على نقاط البداية قبل إعداد خطة تأسيس الشركة ومراجعة متطلباتها مع الجهات المختصة.'},
  en:{q:'What should an overseas founder prepare first?',a:'Outline your proposed business activity, ownership structure and intended operating model before consulting the relevant authority.',
   title:'Planning an overseas investment in Saudi Arabia',summary:'Identify the proposed business activities and the questions to confirm before preparing an application.'},
  zh:{q:'外国投资者如何开始准备在沙特设立一家企业？',a:'在准备设立企业时，可以先明确拟开展的经营活动、出资安排和组织形式，并据此向有关主管部门确认适用的现行要求。投资者应当核对文件的有效性以及业务范围是否符合监管规定，并将政府收费与专业咨询服务费用分开记录。正式申请前还要向主管部门核对最新公告，不应根据市场信息推断审批结果或所需时间。',
   title:'在沙特设立企业的准备工作',summary:'在开始准备申请资料以前，先记录企业计划涉及的活动以及需要向有关部门确认的问题。'}
 };
 for(const [lang,{q,a}] of Object.entries(localeFixtures)){
  const valid=require('./geo-generated-output-guard.cjs').screenDrafts([{q,a}]);
  assert.equal(valid.accepted.length,1,'synthetic '+lang+' fixture must satisfy unchanged server-aligned draft guard');
 }
 async function analyzeRepair(repairResult,{exhaustFirst=false}={}){
  const calls=[];
  const resultScope={...scope,stageResults:{evidence:{items:evidence}},require:p=>{
   if(p==='./geo-opencode-planner.cjs'||p==='./geo-generated-output-guard.cjs')return require(p);
   assert.equal(p,'./geo-direct-model-providers.cjs');
   return {available:()=>exhaustFirst?models.slice(0,1):models,generate:async(prompt,model)=>{
    const {language:lang,validation_errors:errors,research_evidence:sample}=JSON.parse(prompt);
    calls.push({lang,model,errors,evidenceIds:sample.map(e=>e.id)});
    if(exhaustFirst)return {model,error:'rate_limited'};
    const {q,a,title,summary}=localeFixtures[lang];
    const output={q,a,evidence_ids:[sample[0].id]};
    const editorial={kind:'service',lang,target:'misa-license',title,summary,body:(summary+' ').repeat(4),evidence_ids:[sample[0].id]};
    if(errors)return repairResult({output,editorial,model});
    return {model,data:{opportunities:[{title}],goals:[],drafts:[output,{q:'PRIVATE_RAW_TEXT',a:{invalid:true}}],
     editorial_actions:[editorial,{...editorial,kind:'article'}]}};
   }};
  }};
  vm.runInNewContext(runner.slice(start,end)+'\nthis.analyze=stageGeoAnalysis;',resultScope);
  return {outcome:await resultScope.analyze(),result:resultScope.stageResults.geo_analysis,calls};
 }
 const repaired=await analyzeRepair(({output,editorial,model})=>({model,data:{
  opportunities:[{title:'Must not replace original opportunities'}],goals:[],
  drafts:[{...output,q:'ما الخطوات الأولى لاختيار هيكل الشركة؟',a:'راجع نطاق العمل المقترح والملكية والمسؤوليات قبل اختيار الهيكل ومراجعة المتطلبات التنظيمية المناسبة.'}],
  editorial_actions:[{...editorial,title:'تحديد نطاق النشاط التجاري للشركة',evidence_ids:['invented-id']}]
 }}));
 assert.equal(repaired.calls.length,4);
 assert.equal(repaired.calls.filter(call=>call.errors).length,1);
 assert.deepEqual(repaired.calls.map(call=>call.lang),['ar','en','zh','ar']);
 assert.deepEqual(repaired.calls[3].evidenceIds,repaired.calls[0].evidenceIds);
 assert.equal(repaired.calls[3].model,repaired.calls[0].model);
 assert.deepEqual(repaired.calls[3].errors,{drafts:[{index:1,reason:'invalid_answer'}],editorial_actions:[{index:1,reason:'unknown_kind'}]});
 assert(!JSON.stringify(repaired.calls).includes('PRIVATE_RAW_TEXT'));
 assert.equal(repaired.result.drafts.length,4);
 assert.equal(repaired.result.editorial_actions.length,3,'invented evidence must not produce a replacement');
 assert.equal(repaired.result.opportunities.length,3,'repair cannot replace an already successful output');
 assert.equal(repaired.result.validation.drafts.repaired,1);
 assert.equal(repaired.result.validation.drafts.rejected,3);
 assert.equal(repaired.result.validation.editorial_actions.rejected,3);
 const duplicate=await analyzeRepair(({output,model})=>({model,data:{drafts:[output],editorial_actions:[]}}));
 assert.equal(duplicate.result.drafts.length,3,'a repair cannot append a duplicate');
 const repairQuota=await analyzeRepair(({model})=>({model,error:'quota_exhausted'}));
 assert.equal(repairQuota.calls.length,4,'quota failure during repair cannot produce a fallback call');
 assert.equal(repairQuota.result.languages.ar.validation_repair.outcome,'quota_reached');
 const normalQuota=await analyzeRepair(null,{exhaustFirst:true});
 assert.equal(normalQuota.calls.length,1,'a quota-limited provider is not called again by a later locale');
 assert.equal(normalQuota.outcome.status,'partial');
 console.log('PASS GEO four-provider failover across AR/EN/ZH, bounded requests, honest no-provider partial');
})().catch(e=>{console.error(e);process.exitCode=1});
