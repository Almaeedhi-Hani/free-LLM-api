'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {filterOpportunities}=require('./geo-opportunity-contract.cjs');
const input=[
 {title:'Valid evidence gap',type:'gap',score:35,description:'Observed query with source evidence'},
 {title:'Invalid numeric string',type:'keyword',score:'80'},
 {title:'Invalid kind',type:'competitor',score:50},
 {title:'Another valid item',type:'content',score:0},
 {title:'Invalid score',type:'gap',score:101},
 {title:'Empty description',type:'gap',score:30,description:''}
];
const result=filterOpportunities(input);
assert.deepEqual(result.valid.map(x=>x.title),['Valid evidence gap','Another valid item']);
assert.deepEqual(result.rejected.map(x=>x.index),[1,2,4,5]);
assert.equal(filterOpportunities([]).valid.length,0);
assert.equal(filterOpportunities([{title:'All bad',type:'other',score:20}]).valid.length,0);
const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
assert.match(runner,/filterOpportunities\(generated\)/);
assert.match(runner,/saveGEOStage\('opportunities',items\)/);
assert.match(runner,/status=rejected.length\?'partial':saved.status/);
const planner=fs.readFileSync('scripts/geo-opencode-planner.cjs','utf8');
assert.match(planner,/score as a JSON NUMBER from 0 to 100/);
console.log('PASS GEO opportunity partial-batch isolation, strict contract, and accurate partial reporting');
