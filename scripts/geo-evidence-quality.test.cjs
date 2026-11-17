'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
const start=runner.indexOf('function filterUnrelatedKeywordEvidence(');
const end=runner.indexOf('async function stageEvidence() {',start);
assert(start>=0&&end>start,'execute the actual quality function from the GEO runner');
const scope={
 require:(path)=>{
  assert.equal(path,'./geo-discovery-sources.cjs');
  return require('./geo-discovery-sources.cjs');
 }
};
vm.runInNewContext(runner.slice(start,end)+'\nthis.audit=filterUnrelatedKeywordEvidence;',scope);
const items=[
 {id:'old1',type:'keyword',source:'supabase',original_source:'google-suggest',language:'en',name:'saudi arabia formation football'},
 {id:'old2',type:'keyword',source:'supabase',original_source:'google-suggest',language:'en',name:'saudi arabia formation date'},
 {id:'old3',type:'keyword',source:'supabase',original_source:'google-suggest',language:'en',name:'saudi arabia formation year'},
 {id:'old4',type:'keyword',source:'supabase',original_source:'google-suggest',language:'en',name:'saudi arabia formation day'},
 {id:'old5',type:'keyword',source:'supabase',original_source:'google-suggest',language:'en',name:'saudi arabia formation world cup'},
 {id:'old6',type:'keyword',source:'supabase',original_source:'google-suggest',language:'en',name:'saudi arabia formation'},
 {id:'old7',type:'keyword',source:'supabase',original_source:'google-suggest',language:'en',name:'saudi company formation cost'},
 {id:'zh1',type:'keyword',source:'supabase',original_source:'google-suggest',language:'zh',name:'沙特公司注册'},
 {id:'ar1',type:'keyword',source:'google-suggest',language:'ar',name:'تأسيس شركة أجنبية في السعودية'},
 {id:'fresh-bad',type:'keyword_suggestion',source:'google-suggest',language:'en',name:'saudi arabia formation football'},
 {id:'fresh-good',type:'keyword_suggestion',source:'google-suggest',language:'zh',name:'沙特投资许可证'},
 {id:'manual',type:'keyword',source:'supabase',original_source:'manual',language:'en',name:'custom strategy query'},
 {id:'competitor',type:'competitor',source:'supabase',language:'ar',name:'Investor services firm'}
];
const copy=JSON.stringify(items);
const out=scope.audit(items);
assert.equal(out.items.length,6,'excluded six old English noise terms and one fresh noise term');
assert.equal(out.excluded,7);
assert.equal(out.by_language.en,7);
assert.equal(out.by_language.zh,0);
assert.equal(out.by_language.ar,0);
assert(out.items.some(x=>x.id==='manual'),'human-curated keywords must not be auto-removed from evidence');
assert(out.items.some(x=>x.id==='ar1')&&out.items.some(x=>x.id==='zh1'));
assert(out.items.some(x=>x.id==='fresh-good'),'valid Chinese suggestion survives');
assert(out.items.some(x=>x.id==='competitor'),'competitor evidence unaffected');
assert.equal(JSON.stringify(items),copy,'quality filtering must not mutate stored records');
assert(runner.includes('original_source:k.source'),'API keyword provenance must be retained');
assert.equal(runner.split('original_source:k.source').length,3,'both API and local developer Supabase read paths retain source');
assert(runner.includes('filterUnrelatedKeywordEvidence(evidenceItems)'),'quality gate must run before model evidence selection');
console.log('PASS read-only GEO evidence quality: 6 historic off-topic terms + 1 new term isolated, original keywords unchanged, curated and AR/ZH evidence preserved');
