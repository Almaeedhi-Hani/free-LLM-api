'use strict';
const assert=require('node:assert/strict');
const store=require('../.market-test-build/market-intelligence.js');
const rows=[];let writes=0;
store.upsertCompetitor=async ({domain})=>({id:domain});
store.findVerifiedSerpObservation=async input=>rows.find(o=>
 o.competitor_id===input.competitor_id && o.language===input.language &&
 o.query===input.query && o.observed_at===input.observed_at &&
 o.rank===input.rank && o.url===input.url && o.raw?.source_id===input.source
)??null;
store.recordObservation=async o=>{writes++;rows.push({...o});return o};
const {saveVerifiedSerpObservations,validateVerifiedSerpObservation}=require('../.market-test-build/verified-serp-observations.js');
const evidence={query:'Saudi company formation',language:'en',source:'documented-organic-serp-export',observed_at:'2026-11-17T00:00:00Z',url:'https://example.com/service',rank:2,rank_status:'verified_serp'};
(async()=>{
 assert.equal(validateVerifiedSerpObservation(evidence),true);
 assert.equal(validateVerifiedSerpObservation({...evidence,source:'exa'}),false);
 assert.equal(validateVerifiedSerpObservation({...evidence,rank:7}),false);
 assert.deepEqual(await saveVerifiedSerpObservations([evidence,evidence]),{saved:1,rejected:1});
 assert.deepEqual(await saveVerifiedSerpObservations([evidence]),{saved:0,rejected:1});
 assert.equal(writes,1,'repeat imports must not write duplicate observations');
 assert.equal(rows[0].raw.source_id,evidence.source);
 assert.equal(rows[0].rank,2);
 console.log('PASS verified SERP observation bridge and repeat-import dedup');
})().catch(e=>{console.error(e);process.exitCode=1});
