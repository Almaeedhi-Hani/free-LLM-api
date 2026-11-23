'use strict';
const assert=require('node:assert/strict');
const {MASTER_FILE,MASTER_ISSUE,GRACE_MS,masterState,trustedCompletion,reconcile}=
 require('./v3-master-health.cjs');
const now=Date.parse('2026-11-23T07:00:00.000Z');
const item=(minutes,conclusion='success',event='schedule')=>({
 id:400,head_branch:'main',event,status:'completed',conclusion,
 created_at:new Date(now-minutes*60000).toISOString()
});
(async()=>{
 assert.equal(MASTER_FILE,'v3-unified-sequential-test.yml');
 assert.equal(GRACE_MS,3600000);
 assert.equal(masterState([],now).status,'stale');
 assert.equal(masterState([item(10)],now).status,'healthy');
 assert.equal(masterState([item(10,'failure')],now).status,'failed');
 assert.equal(masterState([item(65)],now).status,'stale');
 assert.equal(masterState([item(1,'success','push')],now).status,'stale',
  'push cannot stand in for a true schedule');
 assert.equal(masterState([item(1,'success','workflow_dispatch')],now).status,'stale');
 assert.equal(masterState([{...item(1),status:'in_progress'}],now).status,'pending');
 assert.equal(masterState([item(12),item(63)],now).status,'healthy');
 assert.equal(masterState([item(-2)],now).status,'unknown');
 const event={repository:{full_name:'org/repo'},workflow_run:{
  path:'.github/workflows/'+MASTER_FILE,event:'schedule',
  head_branch:'main',head_repository:{full_name:'org/repo'},id:400
 }};
 assert.equal(trustedCompletion(event),true);
 assert.equal(trustedCompletion({...event,workflow_run:{...event.workflow_run,event:'push'}}),false);
 assert.equal(trustedCompletion({...event,workflow_run:{...event.workflow_run,head_repository:{full_name:'evil/repo'}}}),false);
 assert.equal(trustedCompletion({...event,workflow_run:{...event.workflow_run,path:'.github/workflows/gsc-daily-sync.yml'}}),false);
 const calls=[];
 const mock=(runs,pause='active')=>({
  pauseStatus:async id=>{assert.equal(id,'W01');return {status:pause,reason:'V3_MASTER_PAUSED'};},
  workflowRuns:async file=>{assert.equal(file,MASTER_FILE);return runs;},
  upsertIssue:async x=>{calls.push({kind:'upsert',...x});return {result:'updated'};},
  resolveIssue:async (title,body)=>{calls.push({kind:'resolve',title,body});return {result:'resolved'};}
 });
 assert.equal((await reconcile(mock([], 'active'),{now})).health,'stale');
 assert.equal(calls.at(-1).title,MASTER_ISSUE);
 assert.equal(calls.at(-1).label,'watchdog');
 assert.equal((await reconcile(mock([item(2)]),{now})).health,'healthy');
 assert.equal(calls.at(-1).kind,'resolve');
 assert.equal((await reconcile(mock([item(2,'failure')]),{now,mode:'on-completion',event})).health,'failed');
 const before=calls.length;
 assert.equal((await reconcile(mock([item(2,'failure')]),{now,mode:'on-completion',
  event:{...event,workflow_run:{...event.workflow_run,event:'push'}}})).result,'ignored_non_master_or_untrusted_completion');
 assert.equal(calls.length,before);
 assert.equal((await reconcile(mock([],'paused'),{now})).health,'paused');
 assert.equal(calls.at(-1).kind,'resolve');
 assert.equal((await reconcile(mock([],'unknown'),{now})).result,'unknown');
 console.log('PASS standalone Master watchdog detects missing schedule, failure, old runs; ignores push, trusted events and owner pause');
})().catch(e=>{console.error(e);process.exitCode=1});
