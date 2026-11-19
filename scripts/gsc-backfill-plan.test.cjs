'use strict';
const assert=require('node:assert/strict');
const {planGscCatchup}=require('../.visibility-test-build/gsc-backfill-plan.js');
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
const cron=fs.readFileSync('src/app/api/cron-gsc/route.ts','utf8');
assert(cron.includes('collectGscDimensionRows'),'existing production GSC collector remains untouched');
const pkg=fs.readFileSync('package.json','utf8');
assert(pkg.includes('scripts/gsc-backfill-plan.test.cjs'));
console.log('PASS read-only GSC missing-day, failed-day, no-data retry, timing and quota planner');
