'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {tenMinuteDue,chooseEventSlot,PRODUCTION_MASTER_CRON}=require('./scheduled-event-slot.cjs');
const read=x=>fs.readFileSync('.github/workflows/'+x,'utf8');
const master=read('v3-production-orchestrator.yml');
const cases=[
 ['market','2026-11-23T03:00:02.000Z',true],
 ['market','2026-11-23T03:15:02.000Z',false],
 ['market','2026-11-23T01:00:02.000Z',false],
 ['geo','2026-11-23T01:00:02.000Z',true],
 ['geo','2026-11-23T01:15:02.000Z',false],
 ['geo','2026-11-23T03:00:02.000Z',false],
 ['publication','2026-11-23T02:00:02.000Z',true],
 ['publication','2026-11-23T02:15:02.000Z',false],
 ['llm','2026-11-23T02:15:02.000Z',true],
 ['llm','2026-11-23T02:30:02.000Z',false],
 ['maintenance','2026-11-23T02:45:02.000Z',true],
 ['maintenance','2026-11-23T03:00:02.000Z',false],
 ['maintenance','2026-11-23T00:45:02.000Z',false]
];
assert.equal(PRODUCTION_MASTER_CRON,'*/15 * * * *');
for(const [kind,time,due] of cases){
 const d=tenMinuteDue(kind,time);
 assert.equal(d.allowed,due,kind+' due for '+time);
 if(!due)assert.equal(d.instant,null);
}
(async()=>{
 const event={kind:'geo',event:'schedule',schedule:PRODUCTION_MASTER_CRON,runId:'555',attempt:'1'};
 const lookup=async p=>{
  assert.equal(p,'/actions/runs/555');
  return {id:555,event:'schedule',created_at:'2026-11-23T01:00:02.000Z'};
 };
 assert.deepEqual(await chooseEventSlot(event,lookup),{
  run:true,reason:'production_due',nominal:'2026-11-23T01:00:00.000Z'
 });
 assert.equal((await chooseEventSlot({...event,kind:'market'},lookup)).run,false);
 assert.equal((await chooseEventSlot({...event,attempt:'2'},assert.fail)).reason,'scheduled_rerun');
 await assert.rejects(()=>chooseEventSlot(event,async()=>({id:555,event:'push',created_at:'2026-11-23T01:00:02.000Z'})),/metadata/);
 assert.equal((await chooseEventSlot({...event,event:'workflow_dispatch',schedule:''},assert.fail)).reason,'workflow_dispatch');
 assert.deepEqual([...master.matchAll(/- cron: '([^']+)'/g)].map(m=>m[1]),[],'Master cron suspended while validating Radar alone');
 assert.match(master,/name: V3 production orchestrator \(15-minute cadence\)/);
 assert.match(master,/production-preflight:/);
 assert.match(master,/github\.event_name != 'push'/);
 assert.match(master,/TRIGGER_CRON/,'Keep protected scheduled-event verifier for future activation');
 assert.match(master,/group: v3-production-orchestrator-main/);
 assert.match(master,/cancel-in-progress: false/);
 assert.match(master,/V3_MASTER_PAUSED != 'true'/);
 assert.match(master,/secrets: inherit/);
 const calls={
  'market-radar':'market-radar.yml',
  'geo-intelligence':'geo-analysis.yml',
  'geo-publisher':'geo-auto-publication-daily.yml',
  'llm-feed':'llm-feed-optimization.yml',
  'maintenance':'autonomous-site-maintenance.yml'
 };
 for(const [job,file] of Object.entries(calls)){
  assert(master.includes('  '+job+':'),'Missing production job '+job);
  assert(master.includes('uses: ./.github/workflows/'+file),'Not executing real workflow: '+file);
  assert(read(file).includes('  workflow_call:'),'Production job not reusable: '+file);
  assert(read(file).includes('scheduled-event-slot.cjs --kind='),'Real due gate missing: '+file);
  if(file==='market-radar.yml'){
   assert.match(read(file),/^  schedule:/m,'W02 must have its isolated test cron');
   assert(read(file).includes("- cron: '2,9,16,23,30,37,44,51,58 * * * *'"));
  } else assert(!/^  schedule:/m.test(read(file)),'Other standalone schedule still paused: '+file);
 }
 const radar=master.split('  market-radar:')[1].split('  geo-intelligence:')[0];
 const geo=master.split('  geo-intelligence:')[1].split('  geo-publisher:')[0];
 const pub=master.split('  geo-publisher:')[1].split('  llm-feed:')[0];
 const llm=master.split('  llm-feed:')[1].split('  maintenance:')[0];
 const maint=master.split('  maintenance:')[1].split('  outcome:')[0];
 assert(radar.includes('needs: production-preflight'));
 assert(geo.includes('needs: [production-preflight, market-radar]')&&geo.includes('if: always()'));
 assert(pub.includes('needs: [production-preflight, geo-intelligence]')&&pub.includes('if: always()'));
 assert(!/market-radar|geo-intelligence/.test(llm),'LLM Feed must not depend on GEO/Radar');
 assert(!/market-radar|geo-intelligence/.test(maint),'Maintenance must not depend on GEO/Radar');
 assert(master.includes('NOT eight mocked tests')&&master.includes('This is real production orchestration'));
 assert(!master.includes('npm run test:market')&&!master.includes('v3-unified-readback.cjs'),
  'Master must actually invoke real child workflows rather than fixture-only stages');
 for(const file of ['gsc-daily-sync.yml','v3-phase2-safety-monitor.yml','v3-stage2-quality-watch.yml']){
  assert.doesNotMatch(read(file),/^  schedule:\s*$/m,'Independent '+file+' schedule must be paused');
 }
 console.log('PASS true 15-minute production runner: real 5 reusable workflows, due provider gates, failure isolation, no live calls on push, independent GSC/Safety/Quality');
})().catch(e=>{console.error(e);process.exitCode=1});
