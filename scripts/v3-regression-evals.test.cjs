'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {assessKeyword}=require('../.v3-evals-build/lib/keyword-relevance-eval.js');
const {isDisplayable}=require('../.v3-evals-build/lib/source-policy.js');
const cases=JSON.parse(fs.readFileSync('evals/regression-set.json','utf8'));
const decisions=new Set(['accept','reject','needs_context','out_of_scope_review']);
let passed=0;
for(const item of cases){
 if(item.type==='keyword'){
  assert(['ar','en','zh'].includes(item.language),'evaluation language must be explicit');
  const output=assessKeyword(item.input,item.language);
  assert(decisions.has(output.decision)&&output.reason.length>0);
  assert.equal(output.decision,item.expect,'Keyword: '+item.input);
 }else if(item.type==='source'){
  assert.equal(isDisplayable(item.input),item.expect==='displayed','Source: '+item.input);
 }else throw Error('Unknown regression item type');
 passed++;
}
assert(passed>=11,'Regression corpus is missing required V3 cases');
// The classifier must NOT be wired into publishing until operator approves general rules.
const publisher=fs.readFileSync('src/lib/geo-auto-publication.ts','utf8');
assert(!publisher.includes('assessKeyword('),'generalized rejection needs separate approval');
const feedback=fs.readFileSync('src/lib/geo-agent-feedback.ts','utf8');
assert(feedback.includes('getGeoFeedbackIndex'),'retain the existing append-only feedback memory');
console.log('PASS '+passed+' V3 keyword/source evals (advisory only, production publishing unchanged)');
