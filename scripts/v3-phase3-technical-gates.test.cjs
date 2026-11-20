'use strict';
const assert=require('node:assert/strict');
const {MAX_DAILY_TECHNICAL_ISSUES,planTechnicalIssues,proposeFeedbackRule}
=require('./v3-phase3-technical-gates.cjs');
assert.equal(MAX_DAILY_TECHNICAL_ISSUES,3);
const now='2026-11-20T10:20:00Z';
const candidates=[
 {title:'Check page canonical structure',target_route:'/en/services/company-formation',evidence_status:'verified_serp',observed_at:now},
 {title:'Improve public service schema',target_route:'/zh/services/misa-license',evidence_status:'verified_serp',observed_at:now},
 {title:'Audit localization links',target_route:'/insights',evidence_status:'verified_serp',observed_at:now},
 {title:'Review extra fourth task',target_route:'/packages',evidence_status:'verified_serp',observed_at:now},
 {title:'Unverified provider ranking recommendation',target_route:'/packages',evidence_status:'provider_candidate',observed_at:now},
 {title:'External link injection',target_route:'https://evil.invalid/admin',evidence_status:'verified_serp',observed_at:now},
];
const before=JSON.stringify(candidates);
const plan=planTechnicalIssues(candidates);
assert.equal(plan.writes,0);assert.equal(plan.planned.length,3);
assert.equal(plan.cap,3);
assert.equal(plan.review.filter(x=>x.reason==='daily_technical_issue_cap').length,1);
assert.equal(plan.review.filter(x=>x.reason==='unverified_evidence_or_target').length,2);
assert(plan.planned.every(x=>x.status==='proposal_only'&&x.requires_owner_policy_check));
assert.equal(JSON.stringify(candidates),before,'pure gate cannot change original work items');
const one=planTechnicalIssues(candidates,{maxPerUtcDay:1});
assert.equal(one.planned.length,1);
assert.equal(planTechnicalIssues(candidates,{alreadyOpenedToday:2}).planned.length,1,'honor existing same-day issue count');
assert.equal(planTechnicalIssues(candidates,{alreadyOpenedToday:3}).planned.length,0,'no new issues after three already created');
const duplicates=planTechnicalIssues(candidates,{alreadyOpened:[plan.planned[0].fingerprint]});
assert.equal(duplicates.planned.length,3);
assert(duplicates.review.some(x=>x.reason==='duplicate_technical_handoff'));
assert.equal(planTechnicalIssues(candidates,{maxPerUtcDay:999999}).planned.length,3,'cannot widen cap over three');
const fb={subject_type:'keyword',subject_key:'company formation saudi arabia',reason:'Source quality disagreement'};
assert.equal(proposeFeedbackRule(fb).decision,'await_owner_weekly_review');
assert.equal(proposeFeedbackRule(fb,{weeklyOwnerApproval:true,regressionEvalsPassed:false,actualEvidenceReviewed:true}).enabled,false);
assert.equal(proposeFeedbackRule(fb,{weeklyOwnerApproval:true,regressionEvalsPassed:true,actualEvidenceReviewed:true}).decision,'ready_for_separate_versioned_rule_pr');
assert.equal(proposeFeedbackRule(fb,{weeklyOwnerApproval:true,regressionEvalsPassed:true,actualEvidenceReviewed:true}).enabled,false);
assert.equal(proposeFeedbackRule({...fb,subject_type:'other'}).decision,'invalid_feedback');
console.log('PASS Stage3 offline technical issue cap/dedup, verified evidence and feedback proposals requiring owner + Evals');
