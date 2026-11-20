'use strict';
const assert=require('node:assert/strict');
const {
  WORKFLOWS,expectedIntervalHours,classifyRuns,weeklyKey,issueKey,safeOutcome,
  readStorage,createClient,handleFailure,handleWatchdog,run
}=require('./v3-phase2-monitor.cjs');

const now=Date.parse('2026-11-20T14:00:00Z');
const scheduled=(hoursAgo,conclusion='success')=>({
  event:'schedule',head_branch:'main',status:'completed',conclusion,id:101,
  created_at:new Date(now-hoursAgo*3600000).toISOString(),html_url:'https://github.com/o/r/actions/runs/101'
});
assert.equal(WORKFLOWS.length,6);
assert.equal(expectedIntervalHours(Date.parse('2026-11-21T20:59:59Z')),2);
assert.equal(expectedIntervalHours(Date.parse('2026-11-21T21:00:00Z')),4);
assert.equal(classifyRuns([scheduled(3)],now).status,'healthy');
assert.equal(classifyRuns([scheduled(4.01)],now).status,'stale');
assert.equal(classifyRuns([scheduled(6.01)],now).reason,'schedule_older_than_twice_interval');
assert.equal(classifyRuns([{...scheduled(20),status:'queued',conclusion:null}],now).status,'pending');
assert.equal(classifyRuns([scheduled(12),{...scheduled(0.2),status:'in_progress',conclusion:null}],now).status,'pending');
assert.equal(classifyRuns([{...scheduled(2),event:'workflow_dispatch'}],now).status,'stale');
assert.equal(classifyRuns([scheduled(-1)],now).status,'unknown');
assert.equal(classifyRuns(null,now).status,'unknown');
assert.equal(weeklyKey(Date.parse('2026-11-20T22:00:00Z')),'2026-11-15');
assert.equal(weeklyKey(Date.parse('2026-11-21T21:00:00Z')),'2026-11-22');
assert.equal(issueKey('weekly','2026-11-22'),'[V3 weekly] 2026-11-22');
assert.equal(safeOutcome('a malicious conclusion'),'unknown');

const absent=await readStorage('W01',{url:'',key:''});
assert.equal(absent.status,'unknown');
const notApplicable=await readStorage('W05',{url:'',key:''});
assert.equal(notApplicable.status,'not_applicable');
let readCount=0;
const storage=await readStorage('W02',{
 url:'https://example.supabase.co',key:'test-secret',fetchImpl:async (url,options)=>{
  readCount++;
  assert(url.includes('/analysis_runs?select=finished_at'));
  assert.equal(options.headers.apikey,'test-secret');
  return {ok:true,json:async()=>[{finished_at:'2026-11-20T13:37:00Z'}]};
 }});
assert.equal(readCount,1);
assert.equal(storage.status,'observed');
assert.equal(storage.latestTimestamp,'2026-11-20T13:37:00Z');
assert.equal((await readStorage('W02',{url:'https://evil.test',key:'xx'})).status,'unknown');

const calls=[];
let openIssues=[];
const makeJson=(obj,status=200)=>({status,ok:status>=200&&status<300,json:async()=>obj});
const githubFetch=async (url,options)=>{
  const u=new URL(url),route=u.pathname;
  const body=options.body?JSON.parse(options.body):null;
  calls.push({route,method:options.method||'GET',body});
  if(route.endsWith('/issues') && (!options.method||options.method==='GET'))return makeJson(openIssues);
  if(route.endsWith('/labels')&&options.method==='POST')return makeJson({name:body.name},201);
  if(route.endsWith('/issues')&&options.method==='POST'){
    const issue={number:openIssues.length+1,title:body.title,body:body.body};
    openIssues.push(issue);return makeJson(issue,201);
  }
  if(route.endsWith('/issues/1')&&options.method==='PATCH'){
    openIssues=openIssues.map(x=>({...x,...body}));
    if(body.state==='closed')openIssues=[];
    return makeJson({number:1,...body});
  }
  throw Error('Unhandled fake GitHub HTTP '+route+' '+options.method);
};
const client=createClient({repository:'org/repo',token:'fake-token',fetchImpl:githubFetch});
const rows=[{target:WORKFLOWS[0],run:classifyRuns([scheduled(10)],now),storage:{status:'unknown',note:'not configured'}}];
let result=await handleWatchdog(client,rows,now);
assert.equal(result[0].result,'created');
result=await handleWatchdog(client,rows,now);
assert.equal(result[0].result,'updated'); // existing title updated rather than duplicating
assert.equal(openIssues.length,1);
result=await handleWatchdog(client,[{...rows[0],run:classifyRuns([scheduled(1)],now)}],now);
assert.equal(result[0].result,'resolved');
assert.equal(openIssues.length,0);

const fakeEvent={repository:{full_name:'org/repo'},workflow_run:{
 path:'.github/workflows/geo-analysis.yml',id:999,event:'schedule',head_branch:'main',
 head_repository:{full_name:'org/repo'},conclusion:'failure'
}};
assert.equal((await handleFailure(client,{...fakeEvent,workflow_run:{...fakeEvent.workflow_run,event:'workflow_dispatch'}})).result,'ignored_untrusted_or_non_schedule');
assert.equal((await handleFailure(client,{...fakeEvent,workflow_run:{...fakeEvent.workflow_run,head_repository:{full_name:'attacker/repo'}}})).result,'ignored_untrusted_or_non_schedule');
assert.equal((await handleFailure(client,fakeEvent)).result,'created');
assert.equal(openIssues.length,1);
assert.equal((await handleFailure(client,fakeEvent)).result,'updated');
assert.equal(openIssues.length,1);
assert.equal((await handleFailure(client,{...fakeEvent,workflow_run:{...fakeEvent.workflow_run,conclusion:'success'}})).result,'resolved');
assert.equal(openIssues.length,0);
assert(calls.some(c=>c.route.endsWith('/labels')&&c.body.name==='watchdog'));
assert(calls.some(c=>c.route.endsWith('/labels')&&c.body.name==='failure'));

const mockRunFetch=async (url,options)=>{
  const u=new URL(url);
  if(u.pathname.includes('/actions/workflows/'))return makeJson({workflow_runs:[scheduled(1)]});
  if(u.pathname.endsWith('/issues')&&(!options.method||options.method==='GET'))return makeJson([]);
  if(u.pathname.endsWith('/labels'))return makeJson({},201);
  if(u.pathname.endsWith('/issues')&&options.method==='POST'){
    assert(options.body.includes('model_only never counts as verified citations'));
    return makeJson({number:44},201);
  }
  throw Error('Unexpected weekly mock '+u.pathname);
};
const report=await run({mode:'weekly',repository:'org/repo',token:'fake-token',now,
 fetchImpl:mockRunFetch,supabaseUrl:'',supabaseKey:''});
assert.equal(report.result,'created');
assert.equal(report.number,44);
console.log('PASS V3 Stage 2 isolated watchdog/issue-dedup/weekly/failure/storage and Saudi cutover tests');
