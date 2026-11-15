const assert = require('node:assert/strict');
const {calculateRadarMetrics} = require('../.market-test-build/radar-metrics.js');
const observations = [
 {competitor_id:'x',language:'ar',query:'تكلفة تأسيس شركة',url:'https://example.com/a',observed_at:'2026-11-15T00:00:00Z'},
 {competitor_id:'x',language:'ar',query:'شروط التأسيس'},
 {competitor_id:'z',language:'en',query:'company setup cost',url:'https://example.org/b',observed_at:'2026-11-15T00:00:00Z'},
];
const diagnostics = [
 {source_id:'a',language:'ar',response_received:true,results_parsed:10,results_accepted:2,blocked_detected:false,failure_reason:''},
 {source_id:'b',language:'en',response_received:false,results_parsed:0,results_accepted:0,blocked_detected:true,failure_reason:'blocked'},
];
const m=calculateRadarMetrics(observations,diagnostics);
assert.equal(m.unique_competitors,2);
assert.equal(m.unique_queries,3);
assert.equal(m.languages_covered,2);
assert.equal(m.evidenced_observations,2);
assert.equal(m.evidence_coverage_percent,67);
assert.equal(m.search_response_rate_percent,50);
assert.equal(m.results_parsed,10);
assert.equal(m.results_accepted,2);
assert.equal(m.provider_requests,2);
assert.equal(m.blocked_attempts,1);
assert.equal(m.provider_failures,1);
assert.equal(calculateRadarMetrics([],[]).search_response_rate_percent,null);
console.log('Radar metrics: evidence, query diversity, provider diagnostics passed');
