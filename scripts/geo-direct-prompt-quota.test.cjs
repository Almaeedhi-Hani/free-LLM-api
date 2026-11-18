'use strict';
const assert=require('node:assert/strict');
const {promptForDirectLocale}=require('./geo-opencode-planner.cjs');
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
 assert(parsed.instructions.some(x=>x.includes('rankings')),'Unverified ranking guard');
 assert(parsed.live_site_routes.every(x=>x.url),'Do not create unapproved internal links');
 for(const key of ['opportunities','goals','drafts','editorial_actions'])
  assert(Array.isArray(parsed.output_shape[key]));
}
assert.throws(()=>promptForDirectLocale('es',[{id:'1'}]),/Unsupported/);
assert.throws(()=>promptForDirectLocale('ar',[]),/Evidence/);
console.log('PASS compact 3-language grounded prompt with real evidence IDs and free-tier token budget');
