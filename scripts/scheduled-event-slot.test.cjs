'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {eventSlot,chooseEventSlot}=require('./scheduled-event-slot.cjs');

const market='55 22 * * *',geo='0 21 * * *';
assert.deepEqual(eventSlot('market',market,'2026-11-21T23:50:00.000Z'),
 {instant:'2026-11-21T22:55:00.000Z',allowed:true,kind:'market'});
assert.equal(eventSlot('market','55 0 * * *','2026-11-22T01:20:00.000Z').allowed,false,
 'Sunday 03:55 KSA is the four-hour skipped half slot');
assert.equal(eventSlot('market','55 2 * * *','2026-11-22T05:03:00.000Z').allowed,true,
 'Late Sunday 05:55 KSA survives delayed start');
assert.equal(eventSlot('geo',geo,'2026-11-21T23:30:00.000Z').allowed,true,
 'Sunday 00:00 KSA remains eligible despite 2.5h queue delay');
assert.deepEqual(eventSlot('geo','0 23 * * *','2026-11-22T01:00:00.000Z'),
 {instant:'2026-11-21T23:00:00.000Z',allowed:false,kind:'geo'});
assert.equal(eventSlot('geo','0 1 * * *','2026-11-22T04:00:00.000Z').allowed,true);
assert.equal(eventSlot('geo','0 19 * * *','2026-11-21T20:30:00.000Z').allowed,true,
 'Saturday 22:00 KSA remains within burst mode');
assert.equal(eventSlot('market','55 20 * * *','2026-11-21T21:15:00.000Z').allowed,true);
assert.throws(()=>eventSlot('market','55 1 * * *','2026-11-22T01:00:00.000Z'),/Unexpected/);
assert.throws(()=>eventSlot('geo','0 1-23\/2 * * *','2026-11-22T01:00:00.000Z'),/Invalid/);
assert.throws(()=>eventSlot('geo','0 1 * * *','2026-02-30T01:00:00Z'),/Invalid/);

(async()=>{
 const calls=[];
 const lookup=async path=>{
  calls.push(path);
  return {id:777,event:'schedule',created_at:'2026-11-21T23:30:00.000Z'};
 };
 assert.deepEqual(await chooseEventSlot({
  kind:'geo',event:'schedule',schedule:geo,runId:'777',attempt:'1'},lookup),{
  run:true,reason:'scheduled_slot',nominal:'2026-11-21T21:00:00.000Z'});
 assert.deepEqual(calls,['/actions/runs/777']);
 const noRepeat=await chooseEventSlot({
  kind:'geo',event:'schedule',schedule:geo,runId:'777',attempt:'2'},lookup);
 assert.deepEqual(noRepeat,{run:false,reason:'scheduled_rerun',nominal:null});
 assert.equal(calls.length,1,'rerun must not trigger another provider call');
 assert.equal((await chooseEventSlot({
  kind:'market',event:'workflow_dispatch',schedule:'',runId:'',attempt:''},lookup)).run,true);
 assert.equal((await chooseEventSlot({
  kind:'market',event:'push',schedule:'',runId:'',attempt:''},lookup)).run,true);
 await assert.rejects(()=>chooseEventSlot({
  kind:'market',event:'schedule',schedule:market,runId:'777',attempt:'1'},
  async()=>({id:776,event:'schedule',created_at:'2026-11-21T23:30:00.000Z'})),/metadata/);
 await assert.rejects(()=>chooseEventSlot({
  kind:'market',event:'schedule',schedule:market,runId:'bad',attempt:'1'},lookup),/ID/);

 for(const [file,kind,minute,hours] of [
  ['market-radar.yml','market',55,[0,2,4,6,8,10,12,14,16,18,20,22]],
  ['geo-analysis.yml','geo',0,[1,3,5,7,9,11,13,15,17,19,21,23]]
 ]){
  const workflow=fs.readFileSync('.github/workflows/'+file,'utf8');
  const matches=Array.from(workflow.matchAll(/- cron: '(\d+) (\d+) \* \* \*'/g)).map(x=>[Number(x[1]),Number(x[2])]);
  assert.deepEqual(matches,hours.map(hour=>[minute,hour]),file+' must retain exact UTC frequency');
  assert(workflow.includes('node scripts/scheduled-event-slot.cjs --kind='+kind));
  assert(workflow.includes('CADENCE_EVENT_CRON: ${{ github.event.schedule }}'));
  assert(workflow.includes('GH_TOKEN: ${{ github.token }}'));
  assert(workflow.includes('  actions: read'));
  assert(workflow.includes("if: steps.cadence.outputs.run == 'true'"));
  assert(workflow.includes('cancel-in-progress: false'));
 }
 console.log('PASS market/GEO original UTC trigger times, delayed schedule identity, rerun skip and Nov22 switch');
})().catch(error=>{console.error(error);process.exitCode=1});
