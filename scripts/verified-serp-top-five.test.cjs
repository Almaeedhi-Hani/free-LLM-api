'use strict';
const assert=require('node:assert/strict');
const {verifiedTopFive}=require('./verified-serp-top-five.cjs');
const base={query:'company formation Saudi Arabia',language:'en',source:'documented-organic-serp-export',observed_at:'2026-11-17T00:00:00Z'};
const results=[
 {rank:3,rank_verified:true,url:'https://alpha.example/a',title:'Alpha'},
 {rank:1,rank_verified:true,url:'https://beta.example/b',title:'Beta'},
 {rank:2,rank_verified:false,url:'https://unverified.example/'},
 {rank:4,url:'https://no-evidence.example/'},
 {rank:6,rank_verified:true,url:'https://six.example/'},
 {rank:1,rank_verified:true,url:'https://duplicate-rank.example/'},
 {rank:5,rank_verified:true,url:'javascript:alert(1)'}
];
assert.deepEqual(verifiedTopFive({...base,results}).map(r=>r.rank),[1,3]);
assert.ok(verifiedTopFive({...base,results}).every(r=>r.rank_status==='verified_serp'));
for(const source of ['google-suggest','bing-rss','exa','tavily','parallel','firecrawl'])
 assert.equal(verifiedTopFive({...base,source,results}).length,0,'candidate providers cannot assert SERP rank');
assert.equal(verifiedTopFive({...base,observed_at:'invalid',results}).length,0);
assert.equal(verifiedTopFive({...base,language:'fr',results}).length,0);
assert.equal(verifiedTopFive({...base,results:[{url:'https://no-rank.example/',rank_verified:true}]}).length,0);
console.log('PASS documented SERP top-five provenance contract');
