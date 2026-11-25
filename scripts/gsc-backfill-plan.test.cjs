'use strict';
const assert=require('node:assert/strict');
const {executeGscCatchup,GscQuotaReached,planGscCatchup}=require('../.visibility-test-build/gsc-backfill-plan.js');
const now=new Date('2026-11-19T12:00:00.000Z');
const history=[
 {metric_date:'2026-11-16',status:'success_with_data',checked_at:'2026-11-18T09:00:00Z',rows_fetched:4,attempts:1},
 {metric_date:'2026-11-15',status:'success_no_data',checked_at:'2026-11-17T09:00:00Z',rows_fetched:0,attempts:1},
 {metric_date:'2026-11-14',status:'success_no_data',checked_at:'2026-11-15T08:00:00Z',rows_fetched:0,attempts:1},
 {metric_date:'2026-11-13',status:'failed',checked_at:'2026-11-18T09:00:00Z',rows_fetched:0,attempts:2},
 {metric_date:'2026-11-12',status:'success_with_data',checked_at:'2026-11-16T09:00:00Z',rows_fetched:2,attempts:1},
];
const plan=planGscCatchup({now,earliestDate:'2026-11-10',history});
assert.equal(plan.eligible_through,'2026-11-16');
assert.equal(plan.examined,7);
assert.deepEqual(plan.targets.map(x=>x.date),['2026-11-11','2026-11-10','2026-11-13','2026-11-14']);
assert.deepEqual(plan.targets.map(x=>x.reason),['missing','missing','retry_failed','recheck_no_data']);
assert(!plan.targets.some(x=>x.date==='2026-11-15'),'successful empty day only two days old');
assert(!plan.targets.some(x=>x.date==='2026-11-16'),'successful populated day not retried');
const tight=planGscCatchup({now,earliestDate:'2026-11-10',history,maxDays:2});
assert.equal(tight.targets.length,2);
assert.equal(tight.pending,2);
const emptyAgain=planGscCatchup({now,earliestDate:'2026-11-16',history:[
 {metric_date:'2026-11-16',status:'success_no_data',checked_at:'2026-11-11T09:00:00Z',rows_fetched:0,attempts:3}
]});
assert.equal(emptyAgain.targets[0].reason,'recheck_no_data');
for(const invalid of [
 {now:new Date('invalid'),earliestDate:'2026-11-10',history:[]},
 {now,earliestDate:'2026-02-30',history:[]},
 {now,earliestDate:'2026-11-10',history:[],maxDays:999},
 {now,earliestDate:'2026-11-10',history:[{metric_date:'2026-11-11',status:'success_no_data',checked_at:'2026-11-12T00:00:00Z',rows_fetched:3,attempts:1}]},
 ])assert.throws(()=>planGscCatchup(invalid));
const fs=require('node:fs');
const cron=fs.readFileSync('src/lib/gsc/sync-service.ts','utf8');
assert(cron.includes('collectGscDimensionRows'),'existing production GSC collector remains untouched');
assert(cron.includes('lookbackDays:60'),'catch-up must span both 28-day comparison windows');
assert(cron.includes("const earliestDate='2026-11-15'"),'live backfill must not query before approved first measurement window');
assert(!cron.includes('getHours('),'GSC live endpoint must not gate catchup on runner wall clock');
const approvedFloor=planGscCatchup({now,earliestDate:'2026-11-15',history:[],maxDays:2,lookbackDays:60});
assert.equal(approvedFloor.eligible_through,'2026-11-16');
assert.deepEqual(approvedFloor.targets.map(x=>[x.date,x.reason]),[
 ['2026-11-16','missing'],['2026-11-15','missing'],
]);
assert.equal(approvedFloor.pending,0,'do not spend requests on dates before owner-approved baseline');
const pkg=fs.readFileSync('package.json','utf8');
assert(pkg.includes('scripts/gsc-backfill-plan.test.cjs'));
console.log('PASS read-only GSC missing-day, failed-day, no-data retry, timing and quota planner');

async function testExecution() {
 const property='https://example.test/';
 const outcomes=new Map();
 const writes=[];
 const calls=[];
 const total={clicks:0,impressions:0,ctr:0,position:0};
 const measured={keys:['shared-key'],clicks:2,impressions:5,ctr:0.4,position:8};
 const adapter={
  now,earliestDate:'2026-11-13',history:[],maxDays:4,property,
  async queryRows(date,grain,startRow,rowLimit) {
   assert.equal(rowLimit,1000);
   calls.push([date,grain,startRow]);
   if(date==='2026-11-16') {
    if(grain===null) return [total];
    if(grain==='query') return [measured];
    if(grain==='page_query') return [{...measured,keys:['https://example.test/guide','company formation']}];
    if(grain==='page') return startRow===0
     ? Array.from({length:rowLimit},(_,i)=>({...measured,keys:[`page-${i}`]}))
     : [measured];
   }
   if(date==='2026-11-14') {
    if(grain===null) return [total];
    if(grain==='query') throw Error('sensitive upstream details');
   }
   if(date==='2026-11-13') throw new GscQuotaReached();
   return [];
  },
  async commitDay(write) {
   assert.equal(write.property,property);
   writes.push(write);
   outcomes.set(write.outcome.metric_date,structuredClone(write));
  },
  async readDay(expected) {
   const stored=outcomes.get(expected.outcome.metric_date);
   assert.equal(stored?.property,property);
   assert.deepEqual(stored?.measurements,expected.measurements);
   return {outcome:stored?.outcome??null,matchingMeasurements:stored?.measurements.length??0};
  },
 };
 const run=await executeGscCatchup(adapter);
 assert.deepEqual(run.results.map(x=>[x.outcome.metric_date,x.outcome.status,x.outcome.rows_fetched,x.failure]),[
  ['2026-11-16','success_with_data',1004,undefined],
  ['2026-11-15','success_no_data',0,undefined],
  ['2026-11-14','failed',0,'collection_failed'],
  ['2026-11-13','failed',0,'quota_reached'],
 ]);
 assert.deepEqual(writes[0].measurements.filter(x=>x.dimension_value==='shared-key').map(x=>x.dimension),['query','page']);
 assert.deepEqual(run.results[0].rows_by_dimension,{total:1,query:1,page:1001,country:0,device:0,page_query:1});
 assert(run.results[0].rows_by_dimension.page_query===1,'real paired GSC row recorded');
 assert.deepEqual(writes[2].measurements,[],'partial collection must not reach storage');
 assert.equal(writes[0].outcome.checked_at,now.toISOString());
 assert.deepEqual(calls.filter(x=>x[0]==='2026-11-16'&&x[1]==='page').map(x=>x[2]),[0,1000]);

 const quotaStop=await executeGscCatchup({...adapter,async queryRows(){throw new GscQuotaReached();}});
 assert.equal(quotaStop.results.length,1);
 assert.equal(quotaStop.unattempted,3);
 const retry=await executeGscCatchup({...adapter,earliestDate:'2026-11-16',history:[{
  metric_date:'2026-11-16',status:'failed',checked_at:'2026-11-18T09:00:00Z',rows_fetched:0,attempts:2,
 }]});
 assert.equal(retry.results[0].outcome.attempts,3);

 const duplicate=await executeGscCatchup({...adapter,maxDays:1,async queryRows(_date,grain){
  return grain==='page'?[measured,measured]:[];
 }});
 assert.equal(duplicate.results[0].failure,'collection_failed');
 assert.equal(writes.at(-1).measurements.length,0);
 await assert.rejects(()=>executeGscCatchup({...adapter,readDay:async()=>({outcome:null,matchingMeasurements:0})}),/gsc_day_readback_mismatch/);
 await assert.rejects(()=>executeGscCatchup({...adapter,async readDay(expected){
  return {outcome:outcomes.get(expected.outcome.metric_date)?.outcome,matchingMeasurements:0};
 }}),/gsc_day_readback_mismatch/);
 await assert.rejects(()=>executeGscCatchup({...adapter,commitDay:async()=>{throw Error('write_failed');}}),/write_failed/);
 console.log('PASS isolated GSC execution: grain-aware pagination, quota stop, all-or-nothing adapter and readback');
}
testExecution().catch(error=>{console.error(error);process.exitCode=1;});
