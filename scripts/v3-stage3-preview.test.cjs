'use strict';
// Synthetic evidence only. No Supabase, AI, search API, GitHub issues or publishing calls.
const assert=require('node:assert/strict');
const {previewKeyword,previewFaq,previewEditorial}=require('../.phase3-preview-build/lib/v3-gates-preview.js');
const q=previewKeyword([
 {term:'تأسيس شركة في السعودية للأجانب',language:'ar'},
 {term:'Saudi foreign company formation',language:'en'},
 {term:'沙特外资公司注册',language:'zh'},
 {term:'world cup football',language:'en'},
 {term:'company trademark',language:'en'},
]);
assert.equal(q.applied,false);assert.equal(q.storage_mutated,false);
assert.equal(q.would_remove,1);
assert.equal(q.review_count,1);
assert.deepEqual(q.items.slice(0,3).map(x=>x.decision),['accept','accept','accept']);
assert.equal(q.items[3].decision,'reject');
assert.equal(q.items[4].decision,'out_of_scope_review','trademark is review, not automatic permanent deletion');
assert(q.items.every(x=>x.reason&&x.rule),'every decision needs recorded reason and rule');
assert.throws(()=>previewKeyword(new Array(1001).fill({term:'abc',language:'ar'})),/size/);
const validEnglish={
 q:'What paperwork is generally needed for an overseas investor to register a Saudi company?',
 a:'The business registration process typically starts by determining the business activity and legal form, then preparing the relevant identity and corporate documents. Applicants should verify the current registration and investment requirements with the competent Saudi authorities. Specific steps, eligibility and timelines vary with the activity and applicant, so each document checklist must be checked for the actual filing.',
};
const faq=previewFaq([validEnglish,validEnglish,{q:'Is a license guaranteed?',a:'Guaranteed approval'}]);
assert.equal(faq[0].decision,'eligible_for_existing_policy');
assert.equal(faq[0].requires_human_review,true);
assert.equal(faq[1].decision,'needs_review');
assert(faq[1].reasons.includes('duplicate_question_in_batch'));
assert.equal(faq[2].decision,'needs_review');
const base={
 id:'preview-editorial-001',kind:'home',lang:'en',target:'/',
 title:'Practical support for international company founders in Saudi Arabia',
 summary:'This overview explains what investor services assist with before an applicant consults the relevant official authorities.',
 body:'A foreign investor typically needs to determine the proposed commercial activity and select an appropriate entity structure. The corresponding investment and business registration requirements depend on the sector and official determinations. This advisory service can help organize documentation but is not itself a government licensing authority.',
 risk_level:'low',status:'pending',createdAt:'2026-11-20T10:00:00Z',
 evidence_ids:[],evidence_refs:[],
};
const editorials=previewEditorial([base,{...base,id:'preview-editorial-002',body:base.body+' Visit https://jewark.com for a competitor reference.'},
 {...base,id:'preview-editorial-003',risk_level:'high'},
 {...base,id:'preview-editorial-004',verified_sources:['https://www.arablawfirm.org/']},
 {...base,id:'preview-editorial-005',target:'/unapproved/path'}]);
assert.equal(editorials[0].decision,'eligible_for_existing_policy');
assert.equal(editorials[0].requires_human_review,true);
assert(editorials[1].reasons.includes('competitor_link_in_public_copy'));
assert(editorials[2].reasons.includes('high_risk_human_review'));
assert(editorials[3].reasons.includes('competitor_in_public_citations'));
assert.equal(editorials[4].decision,'needs_review');
assert(editorials[4].reasons.includes('invalid_editorial_contract'));
assert(editorials.every(x=>x.requires_human_review),'no silent publication or human-approval bypass');
console.log('PASS stage3 advisory gates: trilingual keywords, review-only trademark, multilingual FAQ checks and competitor/quality editorial preview');
