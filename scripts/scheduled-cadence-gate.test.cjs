'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {shouldRun,SWITCH_UTC}=require('./scheduled-cadence-gate.cjs');
const d=(s)=>new Date(s);
assert.equal(SWITCH_UTC,'2026-11-21T21:00:00.000Z','Sunday 22 Nov 00:00 KSA');
assert(shouldRun({now:d('2026-11-18T17:00:00Z'),slot:'even'}),'Wednesday 20:00 KSA');
assert(shouldRun({now:d('2026-11-18T18:00:00Z'),slot:'odd'}),'Wednesday 21:00 KSA');
assert(shouldRun({now:d('2026-11-21T19:00:00Z'),slot:'even'}),'Saturday 22:00 KSA');
assert(shouldRun({now:d('2026-11-21T20:00:00Z'),slot:'odd'}),'Saturday 23:00 KSA');
assert(!shouldRun({now:d('2026-11-21T20:00:00Z'),slot:'even'}),'Saturday wrong slot');
assert(shouldRun({now:d(SWITCH_UTC),slot:'even'}),'Sunday 00:00 KSA');
assert(!shouldRun({now:d('2026-11-21T23:00:00Z'),slot:'even'}),'Sunday 02:00 KSA skip');
assert(shouldRun({now:d('2026-11-22T01:00:00Z'),slot:'even'}),'Sunday 04:00 KSA');
assert(shouldRun({now:d('2026-11-21T22:00:00Z'),slot:'odd'}),'Sunday 01:00 KSA');
assert(!shouldRun({now:d('2026-11-22T00:00:00Z'),slot:'odd'}),'Sunday 03:00 KSA skip');
assert(shouldRun({now:d('2026-11-22T02:00:00Z'),slot:'odd'}),'Sunday 05:00 KSA');
assert(shouldRun({now:d('2026-11-29T13:00:00Z'),slot:'even'}),'four-hour mode persists');
assert(shouldRun({now:d('2026-11-25T05:00:00Z'),slot:'even',event:'workflow_dispatch'}),'manual may override cadence');
assert(shouldRun({now:d('2026-11-25T05:00:00Z'),slot:'even',event:'push'}),'workflow-file rollout may override');
assert.throws(()=>shouldRun({slot:'foo'}),/Invalid cadence slot/);
for(const [path,kind,minute,hours] of [
 ['geo-analysis.yml','geo',0,[1,3,5,7,9,11,13,15,17,19,21,23]],
 ['market-radar.yml','market',55,[0,2,4,6,8,10,12,14,16,18,20,22]],
 ['geo-auto-publication-daily.yml','publication',50,[1,3,5,7,9,11,13,15,17,19,21,23]],
 ['llm-feed-optimization.yml','llm',10,[0,2,4,6,8,10,12,14,16,18,20,22]],
 ['autonomous-site-maintenance.yml','maintenance',35,[0,2,4,6,8,10,12,14,16,18,20,22]],
]){
 const src=fs.readFileSync('.github/workflows/'+path,'utf8');
 assert(src.includes('node scripts/scheduled-event-slot.cjs --kind='+kind),
   'Scheduled events must not use runner wall clock in '+path);
 assert(src.includes('steps.cadence.outputs.run'),'Missing guarded job steps in '+path);
 const matches=Array.from(src.matchAll(/- cron: '(\d+) (\d+) \* \* \*'/g))
   .map(x=>[Number(x[1]),Number(x[2])]);
 assert.deepEqual(matches,path==='market-radar.yml'?
   Array.from({length:12},(_,i)=>[55,i*2]).filter((_,i)=>i!==9):[],
   'Only W02 may run restored historical lanes with the 20:09 one-time substitution: '+path);
}
const llm=fs.readFileSync('.github/workflows/llm-feed-optimization.yml','utf8');
assert(llm.includes('node scripts/llm-agent-index.cjs --update'));
assert(llm.includes('node scripts/llm-agent-index.test.cjs'));
assert(llm.includes('gh pr create')&&llm.includes('gh pr merge'));
assert(llm.includes('npm run build'),'publish only after build passes');
require('./gsc-scheduled-slot.test.cjs');
console.log('PASS Saudi time switch Nov22, 2h burst->4h persistent cadence, shared gate and LLM quality guard');
