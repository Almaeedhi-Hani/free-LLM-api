'use strict';
const assert=require('node:assert/strict');
const {promptForDirectLocale}=require('./geo-opencode-planner.cjs');
const {EDITORIAL_KINDS,screenEditorial,eligibleEditorial,EDITORIAL_TEXT_MINIMA,isValidTechnicalTarget}=require('./geo-generated-output-guard.cjs');
const langs=['ar','en','zh'];
for(const lang of langs){
 const evidence=Array.from({length:8},(_,i)=>({
  id:lang+'-source-'+i,language:lang,type:'competitor_candidate',source:'exa',
  title:'Business formation and investor services in Saudi Arabia '+i,
  snippet:'A publicly observed business page, not a verified government requirement. '.repeat(9),
  url:'https://example.com/guide-'+i
 }));
 const prompt=promptForDirectLocale(lang,evidence);
 assert(prompt.length<=15500,'Free model token budget exceeded for '+lang);
 const parsed=JSON.parse(prompt);
 assert.equal(parsed.language,lang);
 assert.equal(parsed.research_evidence.length,8,'Preserve sourced evidence');
 assert.deepEqual(parsed.research_evidence.map(e=>e.id),evidence.map(e=>e.id));
 assert(parsed.instructions.some(x=>x.includes('government agency')),'Official identity disclaimer');
 assert(parsed.instructions.some(x=>x.includes('JSON ONLY')),'Strict JSON output guard');
 const textRules=parsed.editorial_text_contract;
 assert.equal(textRules.title_min,EDITORIAL_TEXT_MINIMA.title[lang]);
 assert.equal(textRules.summary_min,EDITORIAL_TEXT_MINIMA.summary);
 assert.equal(textRules.body_min,EDITORIAL_TEXT_MINIMA.body[lang]);
 assert.equal(textRules.title_max,170);
 assert.equal(textRules.summary_max,360);
 assert.equal(textRules.body_max,10000);
 assert.equal(textRules.on_invalid,'omit_action_without_padding');
 assert(parsed.instructions.some(x=>x.includes('FINAL TEXT VALIDATION')&&x.includes('omit it')),
   'Do not pad or fabricate missing editorial text');
 const technicalRules=parsed.technical_target_contract;
 assert.equal(technicalRules.on_invalid,'omit_action_not_infer_route');
 assert.deepEqual(technicalRules.allowed_values,
   parsed.live_site_routes.map(x=>x.url).filter(isValidTechnicalTarget),
   'Only existing allowed live technical routes may be proposed');
 assert(parsed.instructions.some(x=>x.includes('FINAL TECHNICAL ROUTE VALIDATION')),
   'The exact technical route allowlist must be explained');
 const validRoute=technicalRules.allowed_values[0];
 assert(validRoute,'The allowed live-site technical routes must not be empty');
 const complete={kind:'technical_seo',lang,target:validRoute,
   title:lang==='zh'?'投资者服务页面说明':'Investor service information for foreign businesses',
   summary:'A researched editorial note with a grounded and practical explanation of the selected investor service.',
   body:'An evidence-limited and original overview of the relevant service page, with no unsupported promise or factual invention. '.repeat(2)};
 assert.equal(eligibleEditorial(complete),null,'Exactly scoped completed technical proposal passes existing guard');
 assert.equal(eligibleEditorial({...complete,body:'short'}),'insufficient_text',
   'Do not weaken guard to accept a short body');
 assert.equal(eligibleEditorial({...complete,target:'/invented-technical-route'}),'invalid_technical_target',
   'Do not weaken guard to accept a fabricated route');
 const belowMin={...complete,title:lang==='zh'?'短标题':'Short',summary:'brief',body:'note'};
 assert.equal(eligibleEditorial(belowMin),'insufficient_text');
 assert.deepEqual(parsed.editorial_kind_contract.allowed_values,EDITORIAL_KINDS,
   'free-tier generator must receive same authoritative enum as persistence guard');
 assert.equal(parsed.editorial_kind_contract.on_invalid,'omit_action_not_relabel',
   'do not guess, transform, or silently save unsupported content kinds');
 assert(parsed.instructions.some(x=>x.includes('FINAL ENUM VALIDATION')&&x.includes('editorial_actions:[]')),
   'invalid kind must be omitted at generation time, never relabeled');
 assert.deepEqual(screenEditorial([
   {kind:'article',lang, target:'/', title:'Unsupported generic article'},
   {kind:'page',lang,target:'/',title:'Unsupported page'}
 ],lang).rejected.map(x=>x.reason),['unknown_kind','unknown_kind'],
   'persistence must continue rejecting disallowed kinds');
 const repairPrompt=JSON.parse(promptForDirectLocale(lang,evidence,{
   editorial_actions:[{index:0,reason:'unknown_kind'}],drafts:[]
 }));
 assert.deepEqual(repairPrompt.editorial_text_contract,parsed.editorial_text_contract,
   'Existing single repair must reuse the same exact text minima');
 assert.deepEqual(repairPrompt.technical_target_contract,parsed.technical_target_contract,
   'Existing single repair must reuse the same exact valid target set');
 assert.deepEqual(repairPrompt.editorial_kind_contract.allowed_values,EDITORIAL_KINDS,
   'single existing repair attempt must use the same kind contract');

 assert(parsed.instructions.some(x=>x.includes('rankings')),'Unverified ranking guard');
 assert(parsed.live_site_routes.every(x=>x.url),'Do not create unapproved internal links');
 for(const key of ['opportunities','goals','drafts','editorial_actions'])
  assert(Array.isArray(parsed.output_shape[key]));
}
assert.throws(()=>promptForDirectLocale('es',[{id:'1'}]),/Unsupported/);
assert.throws(()=>promptForDirectLocale('ar',[]),/Evidence/);
console.log('PASS compact 3-language grounded prompt with real evidence IDs and free-tier token budget');
