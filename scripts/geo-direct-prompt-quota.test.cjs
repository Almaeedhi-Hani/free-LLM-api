'use strict';
const assert=require('node:assert/strict');
const {promptForDirectLocale}=require('./geo-opencode-planner.cjs');
const {EDITORIAL_KINDS,screenEditorial}=require('./geo-generated-output-guard.cjs');
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
