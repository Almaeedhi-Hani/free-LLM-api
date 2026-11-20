'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const gate=require('./v3-phase3-review-gates.cjs');
const {assessKeyword}=require('../.phase3-eval-build/keyword-relevance-eval.js');
const sourcePolicy=require('../.impact-test-build/lib/source-policy.js');

const item={
  itemId:'synthetic-1',kind:'editorial',language:'en',category:'general',
  title:'Site navigation and content structure review',
  body:'The already-published public services are described in a clear and accessible overview with consistent navigation.'
};
const deps={assessKeyword,registryVerified:true,competitorDomains:['motaded.com.sa'],
  isCompetitorUrl:sourcePolicy.isCompetitorUrl,
  validateCopy:c=>c.body.length>=30?{ok:true}:{ok:false,code:'insufficient_text'}};
const clean=gate.contentGate(item,deps);
assert.equal(clean.status,'pass_checks');
assert.equal(clean.publicationPermission,'unchanged_existing_policy');
assert.equal(gate.contentGate({...item,category:'legal'},deps).status,'needs_review');
assert.equal(gate.contentGate({...item,category:'financial'},deps).reason,'qualified_human_review_required');
assert.equal(gate.contentGate({...item,category:'residency'},deps).status,'needs_review');
assert.equal(gate.contentGate({...item,riskLevel:'high'},deps).status,'needs_review');
assert.equal(gate.contentGate({...item,category:undefined},deps).reason,'unknown_sensitivity');
assert.equal(gate.contentGate({...item,body:item.body+' https://www.motaded.com.sa/advice'},deps).reason,'competitor_source_or_body_link');
assert.equal(gate.contentGate({...item,cited_sources:['https://motaded.com.sa/abc']},deps).reason,'competitor_source_or_body_link');
assert.equal(gate.contentGate({...item,source_urls:[{url:'https://sub.motaded.com.sa/a'}]},deps).reason,'competitor_source_or_body_link');
assert.equal(gate.contentGate({...item,source_urls:['https://misa.gov.sa/']},deps).status,'pass_checks');
assert.equal(gate.contentGate(item,{...deps,registryVerified:false}).reason,'competitor_registry_unverified');
assert.equal(gate.contentGate(item,{...deps,validateCopy:undefined}).reason,'quality_validator_unavailable');
assert.equal(gate.contentGate(item,{...deps,validateCopy:()=>({ok:false,code:'invalid_copy'})}).qualityCode,'invalid_copy');
assert.equal(gate.contentGate(item,{...deps,validateCopy:()=>{throw Error('bad')}}).reason,'quality_validator_error');
assert.equal(gate.contentGate({...item,language:'fr'},deps).reason,'invalid_language');
assert.equal(gate.contentGate({...item,kind:'unknown'},deps).reason,'unknown_content_kind');
assert.equal(gate.contentGate({...item,itemId:undefined},deps).reason,'missing_stable_item_id');
const seen=new Set();
assert.equal(gate.contentGate(item,deps,seen).status,'pass_checks');
assert.equal(gate.contentGate({...item,itemId:'another-id'},deps,seen).reason,'duplicate_fingerprint');
assert(gate.extractUrlStrings({...item,body:'Read https://misa.gov.sa/en/a, and https://www.motaded.com.sa/x.'}).length>=2);
assert.equal(gate.keywordGate({term:'company formation in saudi arabia',language:'en'},deps).status,'pass_checks');
assert.equal(gate.keywordGate({term:'كأس العالم',language:'ar'},deps).status,'reject');
assert.equal(gate.keywordGate({term:'company logo',language:'en'},deps).reason,'service_scope_not_approved');
assert.equal(gate.keywordGate({term:'商标',language:'zh'},deps).status,'needs_review');
assert.equal(gate.keywordGate({term:'外资公司注册',language:'zh'},deps).status,'pass_checks');
assert.equal(gate.keywordGate({term:'company formation',language:'fr'},deps).status,'needs_review');
assert.equal(gate.keywordGate({term:'company registration',language:'en'},{assessKeyword:null}).reason,'keyword_policy_unavailable');
const observed=new Date(Date.now()-86400000).toISOString();
assert.equal(gate.opportunityGate({id:'opp',language:'ar',observedAt:observed,positionSource:'verified_serp'}).status,'pass_checks');
assert.equal(gate.opportunityGate({id:'opp',language:'en',observedAt:observed,positionSource:'provider_search_rank'}).reason,'unverified_position_source');
assert.equal(gate.opportunityGate({id:'opp',language:'en',observedAt:'unknown'}).reason,'missing_dated_evidence');
assert.equal(gate.opportunityGate({id:'opp',language:'en',observedAt:new Date(Date.now()-91*86400000).toISOString()}).reason,'stale_or_future_evidence');
assert.equal(gate.aiMeasurementGate({measurement_type:'model_only'}).isVerifiedCitation,false);
assert.equal(gate.aiMeasurementGate({measurement_type:'search_grounded',prompt:'company formation',observed_at:observed,source_url:'https://misa.gov.sa'}).isVerifiedCitation,false);
assert.equal(gate.aiMeasurementGate({measurement_type:'search_grounded'}).reason,'incomplete_grounded_evidence');
assert.equal(gate.aiMeasurementGate({measurement_type:'invented'}).reason,'unknown_measurement_type');
const input={contents:[item,{...item,itemId:'duplicate'}],keywords:[
 {term:'company formation in saudi arabia',language:'en'}, {term:'كأس العالم',language:'ar'},
 {term:'company logo',language:'en'}],opportunities:[{id:'opp',language:'en',observedAt:observed}],ai:[{measurement_type:'model_only'}]};
const before=JSON.stringify(input);
const report=gate.batchPreflight(input,deps);
assert.equal(JSON.stringify(input),before,'pure preflight must not mutate source data');
assert.equal(report.writes,0);
assert.equal(report.summary.content.passed,1);
assert.equal(report.summary.content.needsReview,1);
assert.equal(report.summary.keywords.rejected,1);
assert.equal(report.would_remove.length,1);
assert.equal(report.would_remove[0].term,'كأس العالم');
assert(report.evaluations.contents===undefined,'batch has separate content group');
assert(fs.readFileSync('AGENTS.md','utf8').includes('qualified human review'));
console.log('PASS Phase 3: multilingual existing keyword policy, safe official/competitor citation, sensitive-review gates, duplicate prevention, typed AI evidence and no writes');
