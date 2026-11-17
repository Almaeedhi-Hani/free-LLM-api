'use strict';
const assert=require('node:assert/strict');
const {summarizeGscPerformance}=require('../.visibility-test-build/gsc-measured-performance.js');
const empty=summarizeGscPerformance([],['query']);
assert.equal(empty.sampled_rows,0);
assert.equal(empty.ctr,null);
assert.equal(empty.average_position,null);
const rows=[
 {keys:['company setup'],clicks:10,impressions:100,position:2},
 {keys:['misa license'],clicks:5,impressions:50,position:8}
];
const report=summarizeGscPerformance(rows,['query']);
assert.equal(report.clicks,15);
assert.equal(report.impressions,150);
assert.equal(report.ctr,0.1);
assert.equal(report.average_position,4);
assert.equal(report.source,'google_search_console');
assert.equal(report.measured,true);
assert.equal(summarizeGscPerformance([{keys:[],clicks:0,impressions:0,position:0}]).average_position,null);
for(const bad of [
 {keys:['q'],clicks:5,impressions:4,position:1},
 {keys:['q'],clicks:-1,impressions:4,position:1},
 {keys:['q'],clicks:0,impressions:4,position:NaN},
 {keys:[],clicks:0,impressions:4,position:1},
])assert.throws(()=>summarizeGscPerformance([bad],['query']));
assert.throws(()=>summarizeGscPerformance(rows,['rank']));
assert.throws(()=>summarizeGscPerformance(rows,['query','query']));
console.log('PASS GSC measured-only performance aggregation and missing-data safeguards');
