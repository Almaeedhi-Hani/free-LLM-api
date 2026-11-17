'use strict';
const assert=require('node:assert/strict');
const {prepareEditorialOpportunityHandoff}=require('../.market-link-build/lib/editorial-opportunity-handoff.js');
const base={topic_id:'company-formation',target_route:'/services/company-formation',language:'ar',query:'تأسيس شركة',competitor_url:'https://example.org/',evidence_status:'provider_candidate',verified_rank:1,suggested_links:[],review_required:true};
for(const lang of ['ar','en','zh']){
 const handoff=prepareEditorialOpportunityHandoff({...base,language:lang});
 assert(handoff);
 assert.equal(handoff.language,lang);
 assert(handoff.primary_keyword);
 assert(handoff.question);
 assert.equal(handoff.status,'pending_review');
 assert.equal(handoff.verified_rank,null);
 assert.equal(handoff.review_required,true);
}
assert.equal(prepareEditorialOpportunityHandoff({...base,target_route:'/unknown'}),null);
assert.equal(prepareEditorialOpportunityHandoff({...base,topic_id:'company-documents'}),null);
assert.equal(prepareEditorialOpportunityHandoff({...base,review_required:false}),null);
assert.equal(prepareEditorialOpportunityHandoff({...base,evidence_status:'verified_serp',verified_rank:3}).verified_rank,3);
console.log('PASS multilingual editorial handoff and manual review gates');
