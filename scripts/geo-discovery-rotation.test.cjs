'use strict';
const assert=require('node:assert/strict');
const {selectSeeds}=require('./geo-discovery-sources.cjs');
const languages=['ar','en','zh'];
const collected=Object.fromEntries(languages.map(language=>[language,new Set()]));
const start=Date.UTC(2026,0,1);
for(let day=0;day<8;day++){
 const selected=selectSeeds(new Date(start+day*86400000));
 assert.deepEqual(selected.map(item=>item.language),languages);
 assert.equal(selected.length,3);
 for(const item of selected){
  assert.ok(item.q && typeof item.q==='string');
  assert.ok(!collected[item.language].has(item.q),'query must rotate without repeating within 8 days');
  collected[item.language].add(item.q);
 }
 assert.deepEqual(selectSeeds(new Date(start+day*86400000+3600000)),selected,'selection should be stable within a UTC day');
}
for(const language of languages)assert.equal(collected[language].size,8);
assert.deepEqual(selectSeeds(new Date(start)),selectSeeds(new Date(start+8*86400000)),'rotation repeats after 8 days');
console.log('GEO discovery rotation: 24 distinct multilingual queries, deterministic daily selection, 8-day cycle passed');
