'use strict';
const assert=require('node:assert/strict');
const {collectGscDimensionRows:collect,GSC_PAGE_SIZE}=require('../.visibility-test-build/gsc-sync-collector.js');
const row=url=>({keys:[url],clicks:1,impressions:5,ctr:0.2,position:4});
(async()=>{
 const calls=[];
 const pages=await collect(async(d,start,limit)=>{
  calls.push({d,start,limit});
  return start===0?Array.from({length:GSC_PAGE_SIZE},(_,i)=>row('https://example.test/guide-'+i)):[row('https://example.test/new')];
 },'page');
 assert.equal(pages.length,GSC_PAGE_SIZE+1);
 assert.deepEqual(calls.map(x=>x.start),[0,GSC_PAGE_SIZE]);
 assert(calls.every(x=>x.limit===GSC_PAGE_SIZE));
 assert.deepEqual(await collect(async()=>[],'page'),[]);
 assert.deepEqual(await collect(async()=>[{clicks:0,impressions:0,ctr:0,position:0}],null),[{clicks:0,impressions:0,ctr:0,position:0}]);
 for(const bad of [
  [{keys:[],clicks:1,impressions:5,ctr:0.2,position:4}],
  [{keys:['x'],clicks:2,impressions:1,ctr:2,position:1}],
  [{keys:[''],clicks:0,impressions:0,ctr:0,position:0}]
 ]) await assert.rejects(()=>collect(async()=>bad,'page'),/invalid_row/);
 let last=0;
 await assert.rejects(()=>collect(async(_d,n)=>{last=n;return Array.from({length:GSC_PAGE_SIZE},()=>row('https://example.test/x'))},'page'),/row_ceiling/);
 assert.equal(last,24000);
 const source=require('node:fs').readFileSync('src/app/api/cron-gsc/route.ts','utf8');
 assert(source.includes('collectGscDimensionRows')&&source.includes('page_rows')&&source.includes('gsc_daily_metrics?on_conflict='));
 console.log('PASS GSC: paginated dimensions, real zero rows, safe bounds, no fabricated page metrics');
})().catch(e=>{console.error(e);process.exitCode=1});
