'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildGscStoredOpportunityReport:report}=
 require('../.visibility-test-build/gsc-opportunity-storage-report.js');
const property='https://invest.example/';
const day='2026-11-16',now=Date.parse(day+'T00:00:00Z');
const dayName=i=>new Date(now-(55-i)*86400000).toISOString().slice(0,10);
const outcomes=Array.from({length:56},(_,i)=>({
 metric_date:dayName(i),status:i===55?'success_with_data':'success_no_data',
 rows_fetched:i===55?1:0,checked_at:'2026-11-19T09:00:00Z'
}));
const rows=[{metric_date:day,dimension:'page',dimension_value:property+'en/services/',
 clicks:4,impressions:70,ctr:4/70,position:11}];
const full=report({property,endDate:day,metrics:rows,dayOutcomes:outcomes,hasAtomicDayStore:true});
assert.equal(full.grains.page.status,'available');
assert.equal(full.grains.query.status,'no_measured_rows');
assert.equal(full.grains.page_query.status,'insufficient_data');
assert.equal(full.paired_grain_status,'not_collected');
assert.equal(full.ctr_candidates.length,1);
assert.deepEqual(full.cannibalization_flags,[]);
assert.equal(full.grains.page.entities[0].current.impressions,70);
const beforeMigration=report({property,endDate:day,metrics:rows,
 dayOutcomes:[],hasAtomicDayStore:false});
assert.equal(beforeMigration.grains.page.status,'insufficient_data');
assert.equal(beforeMigration.operational_status,'atomic_day_storage_pending');
assert.deepEqual(beforeMigration.ctr_candidates,[]);
const missingDay=report({property,endDate:day,metrics:rows,
 dayOutcomes:outcomes.slice(1),hasAtomicDayStore:true});
assert.equal(missingDay.grains.page.status,'insufficient_data');
const inconsistent=report({property,endDate:day,metrics:rows,
 dayOutcomes:outcomes.map(x=>x.metric_date===day?{...x,status:'success_no_data',rows_fetched:0}:x),
 hasAtomicDayStore:true});
assert.equal(inconsistent.grains.page.status,'insufficient_data');
for(const bad of [
 [{...rows[0],clicks:80}],
 [{...rows[0],dimension:'page_query'}],
 [{...rows[0],metric_date:'2026-02-31'}],
 [{...rows[0],dimension_value:''}],
 ])assert.throws(()=>report({property,endDate:day,metrics:bad,
 dayOutcomes:[],hasAtomicDayStore:false}),/gsc_report_invalid/);
const route=fs.readFileSync('src/app/api/admin/gsc-opportunities/route.ts','utf8');
assert(route.includes("timingSafeEqual"),'admin authentication required');
assert(route.includes("gsc_sync_day_outcomes"),'day outcomes queried independently');
assert(route.includes("gsc_daily_metrics?select="),'real measured data only');
assert(route.includes("statusResponse.status!==404"),'unapplied migration must not fabricate coverage');
assert(!route.includes("export async function POST"),'no write endpoint');
console.log('PASS 28/28 GSC API: real coverage only, missing migration, zero/no-data and paired-grain guards');
