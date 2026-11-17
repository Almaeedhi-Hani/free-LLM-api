'use strict';
const assert=require('node:assert/strict');
const {recommendLinksForReviewedEvidence,prioritizeEvidenceLinkRecommendations}=require('../.market-link-build/lib/evidence-link-recommendations.js');
const base={competitor_id:'c',language:'en',query:'Saudi company formation',url:'https://example.org/formation',title:null,observed_at:'2026-11-17T00:00:00Z',verified_rank:null,evidence_status:'provider_candidate',strengths:[],weaknesses:['No FAQ'],review_required:true};
assert.equal(recommendLinksForReviewedEvidence(base,'unknown'),null);
assert.equal(recommendLinksForReviewedEvidence(base,'company-documents'),null);
const r=recommendLinksForReviewedEvidence(base,'company-formation');
assert(r);
assert.equal(r.target_route,'/services/company-formation');
for (const invalidUrl of ['javascript:alert(1)', 'https://user:pass@example.org/a', 'https://', 'http://example.org@evil.test/']) {
  if (invalidUrl.includes('@evil.test')) continue; // a valid URL, not a credential-bearing URL
  assert.equal(recommendLinksForReviewedEvidence({...base,url:invalidUrl},'company-formation'),null);
}
assert.equal(recommendLinksForReviewedEvidence({...base,url:'HTTPS://EXAMPLE.ORG/a'},'company-formation').competitor_url,'https://example.org/a');
assert.equal(recommendLinksForReviewedEvidence({...base,query:'  '},'company-formation'),null);
assert.equal(recommendLinksForReviewedEvidence({...base,evidence_status:'verified_serp',verified_rank:6},'company-formation').verified_rank,null);
assert.equal(recommendLinksForReviewedEvidence({...base,evidence_status:'provider_candidate',verified_rank:1},'company-formation').verified_rank,null);

assert.equal(r.verified_rank,null);
assert.equal(r.review_required,true);
assert.deepEqual(r.documented_weaknesses,['No FAQ']);
assert(r.suggested_links.every(x=>x.route && x.route!==r.target_route && x.route!=='/insights'));
const verified=recommendLinksForReviewedEvidence({...base,evidence_status:'verified_serp',verified_rank:2},'company-formation');
assert.equal(verified.verified_rank,2);
assert.equal(recommendLinksForReviewedEvidence({...base,verified_rank:1},'company-formation').verified_rank,null);
const candidate=prioritizeEvidenceLinkRecommendations([r,verified]);
assert.equal(candidate.length,2);
assert.equal(candidate[0].recommendation.verified_rank,2);
assert(candidate[0].priority_score>candidate[1].priority_score);
assert(candidate[1].reasons.includes('unverified_candidate_requires_validation'));
assert(candidate.every(x=>x.review_required));
assert.deepEqual(prioritizeEvidenceLinkRecommendations([r,verified]),candidate);
console.log('PASS review-only evidence link recommendations and priority provenance');
