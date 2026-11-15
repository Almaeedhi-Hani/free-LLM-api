"use strict";
const assert=require("node:assert/strict");
const {computeVisibilityScorecard}=require("../.visibility-test-build/visibility-outcomes.js");
const empty=computeVisibilityScorecard([]);
for(const key of ["indexing","organic_first","ai_citation","ai_mention","ai_recommendation","qualified_leads"]){
 assert.equal(empty[key].rate_percent,null,key+" has unknown baseline; never fabricate zero");
}
const base={sample_id:"one",observed_at:"2026-11-15T10:00:00Z",language:"ar",country:"SA",query:"شركة تأسيس شركات في السعودية",evidence_url:"https://evidence.example.org/1"};
const obs=[
 {...base,kind:"indexing",source:"gsc_url_inspection",page_url:"https://example.org/packages",indexed:true,google_canonical:"https://example.org/packages"},
 {...base,sample_id:"two",kind:"organic_rank",source:"manual_organic_serp",city:"Riyadh",device:"mobile",surface:"organic",page_url:"https://example.org/packages",position:1},
 {...base,sample_id:"three",kind:"ai_citation",provider:"test",answer_url:"https://answers.example.org/3",cited_page_url:"https://example.org/packages",cited:true,citation_verified:true},
 {...base,sample_id:"four",kind:"ai_recommendation",provider:"test",answer_url:"https://answers.example.org/4",brand_in_prompt:false,mentioned:true,recommended:false,recommendation_reason:null},
 {...base,sample_id:"five",kind:"qualified_lead",lead_id:"anonymous-1",attribution:"organic",qualified:true},
 {...base,sample_id:"six",kind:"organic_rank",source:"manual_organic_serp",city:"Riyadh",device:"mobile",surface:"organic",page_url:"https://example.org/packages",position:null},
 {...base,sample_id:"invalid",kind:"ai_recommendation",provider:"test",answer_url:"https://answers.example.org/invalid",brand_in_prompt:false,mentioned:true,recommended:true,recommendation_reason:null},
];
const d=computeVisibilityScorecard(obs,{country:"SA",language:"ar"});
assert.equal(d.indexing.rate_percent,100);
assert.equal(d.organic_first.samples,2);assert.equal(d.organic_first.rate_percent,50);
assert.equal(d.ai_citation.rate_percent,100);
assert.equal(d.ai_mention.rate_percent,100);assert.equal(d.ai_recommendation.rate_percent,0);
assert.equal(d.qualified_leads.rate_percent,100);
assert.equal(computeVisibilityScorecard(obs,{language:"zh"}).organic_first.rate_percent,null);
assert.equal(computeVisibilityScorecard([obs[0],obs[0]]).indexing.samples,1,"duplicate evidence not double-counted");
console.log("PASS independent evidence-gated indexing, organic, AI citation/mention/recommendation and qualified-lead measurements");
