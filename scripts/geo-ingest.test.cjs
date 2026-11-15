"use strict";
const assert=require('node:assert/strict');
const {normalizeGeoBatch,persistGeoBatch}=require('../.geo-ingest-test-build/geo-ingest.js');
(async()=>{
 assert.throws(()=>normalizeGeoBatch({opportunities:[{title:'x',type:'bad',score:55}]}),/Invalid opportunities/);
 assert.throws(()=>normalizeGeoBatch({drafts:[{q:'test',a:'text',risk_level:'wrong'}]}),/Invalid drafts/);
 const sample=normalizeGeoBatch({opportunities:[{title:'Source research',type:'gap',score:20}],goals:[{title:'Review original service guide',priority:'high'}],drafts:[{q:'What documents?',a:'Check directly with the authority.',risk_level:'high'}]});
 const calls={o:0,g:0,d:0,r:0};
 const success=await persistGeoBatch(sample,{
 saveOpportunity:async()=>{calls.o++}, saveGoal:async()=>{calls.g++},
 saveDrafts:async items=>{calls.d++;return items.length},saveReport:async()=>{calls.r++}
 });
 assert.equal(success.ok,true);assert.deepEqual(success.saved,{opportunities:1,goals:1,drafts:1,run_report:0});
 const failed=await persistGeoBatch(sample,{
 saveOpportunity:async()=>{throw Error('RLS or schema error')},
 saveGoal:async()=>{},saveDrafts:async()=>0,saveReport:async()=>{}
 });
 assert.equal(failed.ok,false);assert.equal(failed.saved.opportunities,0);assert.equal(failed.saved.drafts,0);
 assert.equal(failed.errors.length,2);
 const report=normalizeGeoBatch({run_report:{run_at:new Date().toISOString(),status:'partial',last_result:'drafts:partial'}});
 const reported=await persistGeoBatch(report,{saveOpportunity:async()=>{},saveGoal:async()=>{},saveDrafts:async()=>0,saveReport:async()=>{calls.r++}});
 assert.equal(reported.ok,true);assert.equal(reported.saved.run_report,1);
 const fs=require('node:fs');
 const route=fs.readFileSync('src/app/api/geo/results/route.ts','utf8');
 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const store=fs.readFileSync('src/lib/content-store.ts','utf8');
 assert(!route.includes('/rest/v1/content_drafts'),'drafts stored in actual content_store, not nonexistent table');
 assert(route.includes('setContent({drafts:incoming})'));
 assert(store.includes("prior.status==='approved'||prior.status==='rejected'"),'must not requeue approved/rejected drafts');
 assert(runner.includes("process.exit(r.pipeline_ok ? 0 : 1)"),'CI job must fail on partial persistence');
 assert(runner.includes('output.dashboard_synced=await updateGEOAgentRun(output)'));
 console.log('PASS verified GEO persistence counts, dashboard syncing, failed writes, no nonexistent tables or silent job success');
})().catch(e=>{console.error(e);process.exit(1)});
