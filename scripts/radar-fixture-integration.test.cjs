'use strict';
const assert = require('node:assert/strict');
const {RADAR_QUERIES}=require('../.market-test-build/radar-query-plan.js');
const {buildQueryMemory,chooseNextQueries,buildCompetitorMatrix}=require('../.market-test-build/radar-memory.js');
const {calculateRadarMetrics}=require('../.market-test-build/radar-metrics.js');
const now=new Date('2026-11-15T12:00:00Z');
const ar=RADAR_QUERIES.ar, en=RADAR_QUERIES.en, zh=RADAR_QUERIES.zh;
const observations=[
 {competitor_id:'x',language:'ar',query:ar[0].query,rank:1,url:'https://x.example/ar',observed_at:'2026-11-14T12:00:00Z'},
 {competitor_id:'z',language:'ar',query:ar[1].query,rank:1,url:'https://z.example/ar',observed_at:'2026-11-14T12:00:00Z'},
 {competitor_id:'x',language:'en',query:en[0].query,rank:2,url:'https://x.example/en',observed_at:'2026-11-14T12:00:00Z'},
 {competitor_id:'w',language:'zh',query:zh[2].query,rank:1,url:'https://w.example/zh',observed_at:'2026-10-01T12:00:00Z'},
];
const diagnostics=[
 {source_id:'a',language:'ar',response_received:true,results_parsed:6,results_accepted:2,blocked_detected:false,failure_reason:''},
 {source_id:'b',language:'en',response_received:true,results_parsed:2,results_accepted:1,blocked_detected:false,failure_reason:''},
 {source_id:'c',language:'zh',response_received:false,results_parsed:0,results_accepted:0,blocked_detected:true,failure_reason:'rate limited'}
];
const memory=buildQueryMemory(observations,now);
const next=chooseNextQueries(memory,1,now);
assert.equal(next.length,3);
assert.ok(next.every(x=>!observations.some(o=>o.language===x.language&&o.query===x.query)),'Prefer unseen angles');
const matrix=buildCompetitorMatrix(observations);
assert.equal(matrix.length,3);
assert.deepEqual(matrix.find(x=>x.competitor_id==='x').languages,['ar','en']);
assert.deepEqual(matrix.find(x=>x.competitor_id==='x').angles,['setup']);
assert.deepEqual(matrix.find(x=>x.competitor_id==='z').angles,['cost']);
assert.deepEqual(matrix.find(x=>x.competitor_id==='w').angles,['requirements']);
const metrics=calculateRadarMetrics(observations,diagnostics);
assert.equal(metrics.unique_competitors,3);
assert.equal(metrics.unique_queries,4);
assert.equal(metrics.evidence_coverage_percent,100);
assert.equal(metrics.search_response_rate_percent,67);
assert.equal(metrics.blocked_attempts,1);
assert.equal(metrics.results_accepted,3);
console.log('PASS radar fixture integration: multi-angle discovery memory, competitor matrix, provider diagnostics');
