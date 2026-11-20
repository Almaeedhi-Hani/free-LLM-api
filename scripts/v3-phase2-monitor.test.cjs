'use strict';
const assert=require('node:assert/strict');
const {
  WORKFLOWS,expectedIntervalHours,classifyRuns,weeklyKey,issueKey,safeOutcome,
  readStorage,persistedFreshness,readGscMeasured,gscSummaryLine,readWeeklyEvidence,weeklyEvidenceLines,createClient,handleFailure,handleWatchdog,run
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

(async()=>{
// Schedule success and persisted-result freshness are independent evidence.
// W05/W06 can be no_change and missing credentials never mean fresh.
assert.equal(persistedFreshness({status:'observed',latestTimestamp:new Date(now-2*3600000).toISOString()},now).status,'fresh');
assert.equal(persistedFreshness({status:'observed',latestTimestamp:new Date(now-4*3600000).toISOString()},now).status,'fresh');
assert.equal(persistedFreshness({status:'observed',latestTimestamp:new Date(now-4.1*3600000).toISOString()},now).status,'stale');
assert.equal(persistedFreshness({status:'unknown',note:'no credentials'},now).status,'unknown');
assert.equal(persistedFreshness({status:'not_applicable'},now).status,'not_applicable');
assert.equal(persistedFreshness({status:'observed',latestTimestamp:new Date(now+3600000).toISOString()},now).status,'unknown');
assert.equal(persistedFreshness({status:'observed',latestTimestamp:'invalid'},now).status,'unknown');
assert.equal(persistedFreshness({status:'observed',latestTimestamp:new Date(Date.parse('2026-11-22T01:00:00Z')-7*3600000).toISOString()},Date.parse('2026-11-22T01:00:00Z')).status,'fresh');
assert.equal(persistedFreshness({status:'observed',latestTimestamp:new Date(Date.parse('2026-11-22T01:00:00Z')-9*3600000).toISOString()},Date.parse('2026-11-22T01:00:00Z')).status,'stale');

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
  if(route.includes('/actions/variables/'))return makeJson({},404);
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
// Live rehearsal found GitHub Issues GET can temporarily omit an Issue that
// POST /issues just created. In one job, a repeated upsert must reuse its ID.
let delayedListReads=0,createdIds=[],issuePatchCalls=[];
const staleReadClient=createClient({repository:'org/repo',token:'fake-token',fetchImpl:async(url,options={})=>{
 const u=new URL(url),p=u.pathname,method=options.method||'GET';
 if(p.endsWith('/issues') && method==='GET'){delayedListReads++;return makeJson([]);}
 if(p.endsWith('/labels') && method==='POST')return makeJson({name:'failure'},201);
 if(p.endsWith('/issues') && method==='POST'){
   createdIds.push(991);
   return makeJson({number:991,title:JSON.parse(options.body).title},201);
 }
 if(p.endsWith('/issues/991') && method==='PATCH'){
   issuePatchCalls.push(JSON.parse(options.body));
   return makeJson({number:991},200);
 }
 throw Error('Unexpected delayed Issue read fixture '+p+' '+method);
}});
const syntheticTitle='[rehearsal fixture] source specific failure';
const initial=await staleReadClient.upsertIssue({title:syntheticTitle,body:'synthetic 1',label:'failure'});
const retry=await staleReadClient.upsertIssue({title:syntheticTitle,body:'synthetic 2',label:'failure'});
assert.deepEqual([initial.result,retry.result],['created','updated']);
assert.equal(initial.number,retry.number);
assert.equal(createdIds.length,1,'eventually-consistent GET must not create duplicate Issue');
assert.equal(delayedListReads,1,'repeat lookup should reuse local created Issue');
assert.equal(issuePatchCalls.length,1,'updated body must patch same Issue');
await staleReadClient.upsertIssue({title:syntheticTitle,body:'synthetic 2',label:'failure'});
assert.equal(issuePatchCalls.length,1,'unchanged issue body is not rewritten');
const resolved=await staleReadClient.resolveIssue(syntheticTitle,'synthetic resolved');
assert.equal(resolved.result,'resolved');
assert.equal(issuePatchCalls.at(-1).state,'closed');

const rows=[{target:WORKFLOWS[0],run:classifyRuns([scheduled(10)],now),storage:{status:'unknown',note:'not configured'}}];
let result=await handleWatchdog(client,rows,now);
assert.equal(result[0].result,'created');
result=await handleWatchdog(client,rows,now);
assert.equal(result[0].result,'updated'); // existing title updated rather than duplicating
assert.equal(openIssues.length,1);
result=await handleWatchdog(client,[{...rows[0],run:classifyRuns([scheduled(1)],now)}],now);
assert.equal(result[0].result,'resolved');
assert.equal(openIssues.length,0);

// A successful W02 GitHub schedule with no recent stored radar result
// must raise an independently named watchdog Issue, then resolve only when
// new stored evidence exists. Do not duplicate the schedule-stale Issue.
const savedTarget={target:WORKFLOWS[1],run:classifyRuns([scheduled(1)],now),
 storage:{status:'observed',latestTimestamp:new Date(now-6*3600000).toISOString()}};
let savedAlert=await handleWatchdog(client,[savedTarget],now);
// The existing schedule reconciler also emits a harmless result:'none' when
// its own independent schedule-stale issue does not exist.
const persistedResults=items=>items.filter(x=>x.kind==='persisted_output');
assert.equal(persistedResults(savedAlert).length,1);
assert.equal(persistedResults(savedAlert)[0].result,'created');
assert(openIssues[0].title.includes('persisted output stale'));
savedAlert=await handleWatchdog(client,[savedTarget],now);
assert.equal(persistedResults(savedAlert)[0].result,'updated');
assert.equal(openIssues.length,1,'stale stored output must not create duplicate Issues');
const resolvedStorage={...savedTarget,storage:{status:'observed',
 latestTimestamp:new Date(now-0.5*3600000).toISOString()}};
savedAlert=await handleWatchdog(client,[resolvedStorage],now);
assert.equal(persistedResults(savedAlert)[0].result,'resolved');
assert.equal(openIssues.length,0);
savedAlert=await handleWatchdog(client,[{...savedTarget,storage:{status:'unknown',note:'credentials_unavailable'}}],now);
assert.equal(persistedResults(savedAlert).length,0,'unknown storage cannot be claimed fresh or generate false incidents');
savedAlert=await handleWatchdog(client,[{target:WORKFLOWS[4],run:classifyRuns([scheduled(1)],now),
 storage:{status:'not_applicable'}}],now);
assert.equal(persistedResults(savedAlert).length,0,'W05 no_change must not be an artificial storage incident');

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
  if(u.pathname.includes('/actions/variables/'))return makeJson({},404);
  if(u.pathname.includes('/actions/workflows/'))return makeJson({workflow_runs:[scheduled(1)]});
  if(u.pathname.endsWith('/issues')&&(!options.method||options.method==='GET'))return makeJson([]);
  if(u.pathname.endsWith('/labels'))return makeJson({},201);
  if(u.pathname.endsWith('/issues')&&options.method==='POST'){
    assert(options.body.includes('model_only never counts as verified citations'));
    assert(options.body.includes('| Storage freshness |'));
    assert(options.body.includes('unknown'), 'absent storage remains explicitly unknown');
    return makeJson({number:44},201);
  }
  throw Error('Unexpected weekly mock '+u.pathname);
};
const report=await run({mode:'weekly',repository:'org/repo',token:'fake-token',now,
 fetchImpl:mockRunFetch,supabaseUrl:'',supabaseKey:''});
assert.equal(report.result,'created');
assert.equal(report.number,44);

const workflows=[
 '.github/workflows/geo-analysis.yml',
 '.github/workflows/market-radar.yml',
 '.github/workflows/geo-auto-publication-daily.yml',
 '.github/workflows/gsc-daily-sync.yml',
 '.github/workflows/llm-feed-optimization.yml',
 '.github/workflows/autonomous-site-maintenance.yml'
];
for(const name of workflows) {
 const text=require('node:fs').readFileSync(name,'utf8');
 assert(text.includes("vars.V3_MASTER_PAUSED != 'true'"),'missing master pause condition: '+name);
}
for(const [name,old] of [
 ['.github/workflows/market-radar.yml','MARKET_RADAR_PAUSED'],
 ['.github/workflows/llm-feed-optimization.yml','LLM_INDEX_PAUSED'],
 ['.github/workflows/autonomous-site-maintenance.yml','AUTODEV_PAUSED']
]){
 assert(require('node:fs').readFileSync(name,'utf8').includes(old),'legacy pause flag lost: '+name);
}
const pausedClient=createClient({repository:'org/repo',token:'fake-token',fetchImpl:async (url,opts)=>{
 const u=new URL(url);
 if(u.pathname.endsWith('/actions/variables/V3_MASTER_PAUSED'))
  return makeJson({value:'true'});
 if(u.pathname.endsWith('/issues'))return makeJson([]);
 throw Error('Unwanted operation under master pause '+u.pathname);
}});
assert.equal((await pausedClient.pauseStatus('W01')).status,'paused');
assert.equal((await pausedClient.pauseStatus('W05')).reason,'V3_MASTER_PAUSED');
assert.equal((await handleFailure(pausedClient,fakeEvent)).result,'ignored_paused_or_unknown');
const legacyPausedClient=createClient({repository:'org/repo',token:'fake-token',fetchImpl:async(url)=>{
 const p=new URL(url).pathname;
 if(p.endsWith('V3_MASTER_PAUSED'))return makeJson({},404);
 if(p.endsWith('MARKET_RADAR_PAUSED'))return makeJson({value:'true'});
 throw Error('Unwanted HTTP '+p);
}});
assert.equal((await legacyPausedClient.pauseStatus('W02')).status,'paused');
assert.equal((await legacyPausedClient.pauseStatus('W01')).status,'active');
const unreadableClient=createClient({repository:'org/repo',token:'fake-token',fetchImpl:async()=>{
 return makeJson({},403);
}});
assert.equal((await unreadableClient.pauseStatus('W01')).status,'unknown');

// GitHub Actions vars context is authoritative and requires no repo admin
// read permission. All four variables are always passed, even when unset.
const actionSnapshot={V3_MASTER_PAUSED:'',MARKET_RADAR_PAUSED:'',AUTODEV_PAUSED:'',LLM_INDEX_PAUSED:''};
let contextHttp=0;
const contextClient=createClient({repository:'org/repo',token:'fake-token',
 pauseVarSnapshot:actionSnapshot,fetchImpl:async()=>{contextHttp++;throw Error('should not call variable REST API');}});
assert.equal((await contextClient.pauseStatus('W01')).status,'active');
assert.equal((await contextClient.pauseStatus('W06')).status,'active');
assert.equal(contextHttp,0,'Actions context never needs variable REST permission');
const masterContext=createClient({repository:'org/repo',token:'fake-token',
 pauseVarSnapshot:{...actionSnapshot,V3_MASTER_PAUSED:'true'},
 fetchImpl:async()=>{throw Error('No API call when paused');}});
assert.equal((await masterContext.pauseStatus('W01')).status,'paused');
assert.equal((await masterContext.pauseStatus('W05')).reason,'V3_MASTER_PAUSED');
const legacyContext=createClient({repository:'org/repo',token:'fake-token',
 pauseVarSnapshot:{...actionSnapshot,MARKET_RADAR_PAUSED:'true'},fetchImpl:async()=>{throw Error('No API call');}});
assert.equal((await legacyContext.pauseStatus('W02')).status,'paused');
assert.equal((await legacyContext.pauseStatus('W01')).status,'active');
const missingContext=createClient({repository:'org/repo',token:'fake-token',
 pauseVarSnapshot:{V3_MASTER_PAUSED:''},fetchImpl:async()=>{throw Error('No API call');}});
assert.equal((await missingContext.pauseStatus('W02')).status,'unknown');



// W03 persistence MUST be an attributed outcome from W03, not W01's
// later publication attempt. All checks use mocked HTTPS responses only.
let w03Reads=0;
const w03Storage=await readStorage('W03',{
 url:'https://example.supabase.co',key:'fixture-key',fetchImpl:async url=>{
  w03Reads++;
  const query=new URL(url).searchParams;
  assert.equal(query.get('action'),'eq.geo_publication_rpc_result');
  assert.equal(query.get('metadata->>source_workflow'),'eq.W03');
  assert.equal(query.get('select'),'created_at');
  return makeJson([{created_at:'2026-11-20T11:07:54Z'}]);
 }});
assert.equal(w03Reads,1);
assert.equal(w03Storage.status,'observed');
assert.equal(w03Storage.source,'audit_logs');

// GSC weekly numbers come only from the measured total grain; language,
// country, page, query and device views cannot be double-counted.
const gscMeasured=await readGscMeasured({
 url:'https://example.supabase.co',key:'fixture-key',fetchImpl:async url=>{
  const u=new URL(url);
  assert(u.pathname.endsWith('/rest/v1/gsc_daily_metrics'));
  assert.equal(u.searchParams.get('dimension'),'eq.total');
  assert.equal(u.searchParams.get('select'),'metric_date,impressions,clicks');
  assert.equal(u.searchParams.get('limit'),'7');
  return makeJson([{metric_date:'2026-11-17',impressions:3,clicks:0},
    {metric_date:'2026-11-16',impressions:0,clicks:0}]);
 }});
assert.equal(gscMeasured.status,'observed');
assert.equal(gscMeasured.latestDate,'2026-11-17');
assert.equal(gscMeasured.impressions,3);
assert.equal(gscMeasured.clicks,0);
assert.equal(gscMeasured.observedDays,2);
assert(gscSummaryLine(gscMeasured).includes('3 impressions, 0 clicks'));
assert(gscSummaryLine({status:'unknown',note:'unavailable'}).includes('unknown'));
assert.equal((await readGscMeasured({url:'',key:''})).status,'unknown');
assert.equal((await readGscMeasured({url:'http://example.com',key:'fixture'})).status,'unknown');
assert.equal((await readGscMeasured({url:'https://example.supabase.co',key:'fixture',
 fetchImpl:async()=>makeJson([{metric_date:'2026-11-17',impressions:3,clicks:0},
  {metric_date:'2026-11-17',impressions:3,clicks:0}])})).status,'unknown');
assert.equal((await readGscMeasured({url:'https://example.supabase.co',key:'fixture',
 fetchImpl:async()=>makeJson([{metric_date:'2026-11-17',impressions:null,clicks:0}])})).status,'unknown');

// The Sunday report must count only persisted seven-day keyword feedback,
// never infer acceptance from irrelevant votes or mix GSC total/page grains.
const measuredFixture=async (url)=>{
 const u=new URL(url);
 if(u.pathname.endsWith('/geo_agent_feedback')){
  assert.equal(u.searchParams.get('subject_type'),'eq.keyword');
  assert.equal(u.searchParams.get('limit'),'501');
  return makeJson([
   {subject_type:'keyword',decision:'irrelevant',created_at:'2026-11-19T08:00:00Z'},
   {subject_type:'keyword',decision:'irrelevant',created_at:'2026-11-18T08:00:00Z'}
  ]);
 }
 if(u.pathname.endsWith('/gsc_daily_metrics')){
  assert.equal(u.searchParams.get('dimension'),'eq.page');
  assert.equal(u.searchParams.get('limit'),'5');
  return makeJson([{metric_date:'2026-11-17',
   dimension_value:'https://free-llm-api-1-didl.onrender.com/en/services/misa-license',
   impressions:3,clicks:0,position:3}]);
 }
 throw Error('Unexpected measurement route '+u.pathname);
};
const measuredWeekly=await readWeeklyEvidence({
 url:'https://example.supabase.co',key:'fixture-key',now,fetchImpl:measuredFixture
});
assert.equal(measuredWeekly.feedback.status,'observed');
assert.equal(measuredWeekly.feedback.sampleSize,2);
assert.equal(measuredWeekly.feedback.counts.irrelevant,2);
assert.equal(measuredWeekly.feedback.counts.accepted,0);
assert.equal(measuredWeekly.page.status,'observed');
assert.equal(measuredWeekly.page.path,'/en/services/misa-license');
assert.equal(measuredWeekly.page.impressions,3);
assert.equal(measuredWeekly.page.clicks,0);
assert(weeklyEvidenceLines(measuredWeekly).join('\n').includes('irrelevant=2'));
assert(weeklyEvidenceLines(measuredWeekly).join('\n').includes('not weekly total'));
const noEvidence=await readWeeklyEvidence({url:'',key:'',now});
assert.equal(noEvidence.feedback.status,'unknown');
assert.equal(noEvidence.page.status,'unknown');
const untrustedPage=await readWeeklyEvidence({
 url:'https://example.supabase.co',key:'fixture-key',now,fetchImpl:async url=>{
  const u=new URL(url);
  if(u.pathname.endsWith('/geo_agent_feedback'))return makeJson([]);
  return makeJson([{metric_date:'2026-11-17',
   dimension_value:'https://other.example/en/page',impressions:100,clicks:0,position:1}]);
 }});
assert.equal(untrustedPage.page.status,'unknown');
assert.equal(untrustedPage.feedback.status,'observed');
const truncated=await readWeeklyEvidence({
 url:'https://example.supabase.co',key:'fixture-key',now,fetchImpl:async url=>{
  if(String(url).includes('/geo_agent_feedback?'))
    return makeJson(Array.from({length:501},()=>({
      subject_type:'keyword',decision:'relevant',created_at:'2026-11-19T08:00:00Z'})));
  return makeJson([]);
 }});
assert.equal(truncated.feedback.status,'unknown');

let weeklyPayload='';
await run({mode:'weekly',repository:'org/repo',token:'fake-token',now,
 supabaseUrl:'https://example.supabase.co',supabaseKey:'fixture-key',
 fetchImpl:async (url,options)=>{
  if(String(url).startsWith('https://example.supabase.co/')){
    if(String(url).includes('/gsc_daily_metrics?')){
      if(String(url).includes('dimension=eq.page'))
        return makeJson([{metric_date:'2026-11-17',
          dimension_value:'https://free-llm-api-1-didl.onrender.com/en/services/misa-license',
          impressions:3,clicks:0,position:3}]);
      return makeJson([{metric_date:'2026-11-17',impressions:3,clicks:0}]);
    }
    if(String(url).includes('/geo_agent_feedback?'))
      return makeJson([{subject_type:'keyword',decision:'irrelevant',created_at:'2026-11-19T08:00:00Z'}]);
    return makeJson([]);
  }
  const u=new URL(url);
  if(u.pathname.endsWith('/issues')&&options.method==='POST')
    weeklyPayload=JSON.parse(options.body).body;
  return mockRunFetch(url,options);
 }});
assert(weeklyPayload.includes('GSC measured Search Console (total grain only): 2026-11-17, 3 impressions, 0 clicks'));
assert(weeklyPayload.includes('model_only never counts as verified citations'));
assert(weeklyPayload.includes('Recorded keyword feedback (seven days, 1 decisions): irrelevant=1'));
assert(weeklyPayload.includes('GSC highest-impression page-day sample (not weekly total): /en/services/misa-license'));

console.log('PASS V3 Stage 2 isolated watchdog/issue-dedup/weekly/failure/storage and Saudi cutover tests');
})().catch(err=>{console.error(err);process.exitCode=1;});
