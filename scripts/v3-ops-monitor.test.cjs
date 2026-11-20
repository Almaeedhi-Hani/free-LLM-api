'use strict';
const assert = require('node:assert/strict');
const {WORKFLOWS,CUTOVER,inspectWorkflow,inspectPersistence,safeReport,issueTitle,execute}=require('./v3-ops-monitor.cjs');
const now=Date.parse('2026-11-20T14:00:00Z');
const run=(id,created,conclusion='success',event='schedule')=>({
  id,created_at:created,status:'completed',conclusion,event,head_branch:'main',
  head_sha:'a'.repeat(40),html_url:'https://github.com/owner/repo/actions/runs/'+id
});
assert.equal(Object.keys(WORKFLOWS).length,6);
assert.equal(inspectWorkflow('W01',[run(1,'2026-11-20T11:00:00Z')],now).state,'ok');
assert.equal(inspectWorkflow('W01',[run(1,'2026-11-20T09:00:00Z')],now).state,'stale');
assert.equal(inspectWorkflow('W02',[run(1,'2026-11-20T13:59:00Z','failure')],now).state,'stale');
assert.equal(inspectWorkflow('W02',[run(1,'2026-11-20T13:59:00Z','failure'),run(2,'2026-11-20T12:00:00Z')],now).state,'ok');
assert.equal(inspectWorkflow('W03',[run(1,'2026-11-20T09:00:00Z','success','workflow_dispatch')],now).state,'stale','manual event never substitutes real scheduled proof');
assert.equal(inspectWorkflow('W04',[run(1,'2026-11-20T13:59:00Z','success','push')],now).state,'stale');
assert.equal(inspectWorkflow('W01',[run(5,'2026-11-21T20:30:00Z')],Date.parse('2026-11-22T02:00:00Z')).state,'ok','postcutover 8h double interval');
assert.equal(inspectWorkflow('W01',[run(5,'2026-11-21T17:00:00Z')],Date.parse('2026-11-22T02:00:00Z')).state,'stale');
assert.equal(CUTOVER,Date.parse('2026-11-21T21:00:00Z'));
assert.equal(inspectPersistence('W05',null,now).state,'not_applicable');
assert.equal(inspectPersistence('W06',null,now).state,'not_applicable');
assert.equal(inspectPersistence('W01',null,now).state,'unknown');
assert.equal(inspectPersistence('W02',{source:'supabase',persistence:{W02:{at:'2026-11-20T10:00:00Z',evidence:'analysis_runs_radar',status:'success'}}},now).state,'observed');
assert.equal(inspectPersistence('W03',{source:'supabase',persistence:{W03:{at:'2026-11-18T08:00:00Z',evidence:'audit_logs_w03'}}},now).state,'review','stale DB cannot be treated as success');
assert.throws(()=>issueTitle('WRONG'),/Invalid workflow/);
assert.equal(issueTitle('W04','failure'),'[V3 failure] W04 gsc-daily-sync.yml');
const statuses=Object.fromEntries(Object.keys(WORKFLOWS).map(id=>[id,inspectWorkflow(id,[run(3,'2026-11-20T12:30:00Z')],now)]));
const report=safeReport(statuses,{source:'supabase',gsc:{latest_metric_date:'2026-11-17',latest_outcome:'success_with_data',rows_fetched:4},persistence:{}},now);
assert(report.includes('model_only is NOT search proof'));
assert(report.includes('unknown until'));
assert(report.includes('2026-11-17'));
assert(!report.includes('100% verified'));
const calls=[];
const fakeFetch=async(url,options={})=>{
  calls.push({url:String(url),method:options.method||'GET'});
  let data;
  if(String(url).includes('/actions/workflows/'))data={workflow_runs:[run(12,'2026-11-20T12:00:00Z')]};
  else if(String(url).endsWith('/api/geo/ops-health'))data={source:'supabase',gsc:{latest_metric_date:'2026-11-17',latest_outcome:'success_with_data',rows_fetched:4},persistence:{}};
  else throw Error('Unexpected write/external call '+url);
  return {ok:true,json:async()=>data};
};
(async()=>{
 const env={GITHUB_REPOSITORY:'owner/repo',GITHUB_TOKEN:'test-token',GEO_API_URL:'https://example.com',GEO_API_KEY:'test-key'};
 const result=await execute({fetchImpl:fakeFetch,env,now,mode:'watchdog',dryRun:true});
 assert.equal(result.stale.length,0);
 assert.equal(result.persistence,true);
 assert.equal(calls.length,7);
 assert(calls.every(x=>x.method==='GET'),'dry run must be strictly read only');
 assert(!JSON.stringify(result).includes('test-token'),'no GitHub token in report');
 assert(!JSON.stringify(result).includes('test-key'),'no GEO key in report');
 const failed=await execute({fetchImpl:fakeFetch,env:{...env,FAILED_WORKFLOW_ID:'W01',FAILED_RUN_ID:'44700000001'},now,mode:'failure',dryRun:true});
 assert(failed.body.includes('44700000001')&&!failed.body.includes('test-token'));
 await assert.rejects(()=>execute({fetchImpl:fakeFetch,env:{...env,FAILED_WORKFLOW_ID:'W99',FAILED_RUN_ID:'1'},mode:'failure',dryRun:true}));
 console.log('PASS stage2 watchdog: 6 workflows, cadence cutover, true schedules, DB uncertainty, safe weekly and dry-run issue behavior');
})().catch(err=>{console.error(err);process.exitCode=1;});
