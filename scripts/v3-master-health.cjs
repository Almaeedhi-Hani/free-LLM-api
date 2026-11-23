'use strict';
// Safety Monitor's independent watchdog for the Master itself.
// No external providers, code publication, database mutation, or secret logging.
const fs=require('node:fs');
const {createClient,issueKey}=require('./v3-phase2-monitor.cjs');
const MASTER_FILE='v3-unified-sequential-test.yml';
const MASTER_ISSUE=issueKey('watchdog','Master Workflow schedule stale or failed');
const GRACE_MS=60*60000; // GitHub scheduled events can be delayed.
function masterState(runs,now){
 if(!Array.isArray(runs)||!Number.isFinite(now))return {status:'unknown',reason:'unavailable_runs'};
 const only=runs.filter(x=>x&&x.event==='schedule'&&x.head_branch==='main'&&
  typeof x.created_at==='string'&&Number.isFinite(Date.parse(x.created_at)));
 only.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 const latest=only[0];
 if(!latest)return {status:'stale',reason:'no_master_schedule_delivery',runId:null};
 const age=now-Date.parse(latest.created_at);
 if(age<0||!Number.isFinite(age))return {status:'unknown',reason:'invalid_timestamp'};
 const record={runId:latest.id,createdAt:latest.created_at,ageMinutes:Math.round(age/60000)};
 if(['queued','waiting','in_progress','requested'].includes(latest.status)&&age<=GRACE_MS)
  return {status:'pending',reason:'master_run_in_progress',...record};
 if(latest.status==='completed'&&latest.conclusion==='success'&&age<=GRACE_MS)
  return {status:'healthy',reason:'genuine_scheduled_master_success',...record};
 if(latest.status==='completed'&&latest.conclusion!=='success')
  return {status:'failed',reason:'latest_scheduled_master_not_successful',...record};
 if(age>GRACE_MS)return {status:'stale',reason:'master_last_schedule_too_old',...record};
 return {status:'unknown',reason:'unverified_master_result',...record};
}
function trustedCompletion(event){
 const r=event?.workflow_run;
 return Boolean(r&&r.event==='schedule'&&r.head_branch==='main'&&
   typeof r.path==='string'&&r.path.endsWith('/'+MASTER_FILE)&&
   r.head_repository?.full_name===event.repository?.full_name&&
   typeof r.id==='number'&&r.id>0);
}
async function reconcile(client,{mode='watchdog',event=null,now=Date.now()}={}){
 if(mode==='on-completion'&&!trustedCompletion(event))
  return {result:'ignored_non_master_or_untrusted_completion'};
 if(!['watchdog','on-completion'].includes(mode))throw Error('Unrecognized monitor mode');
 const pause=await client.pauseStatus('W01');
 if(pause.status==='unknown')return {result:'unknown',reason:'pause_context_unavailable'};
 if(pause.status==='paused'){
  const issue=await client.resolveIssue(MASTER_ISSUE,'Master intentionally paused via '+pause.reason+
   '. No schedule failure alert. Checked '+new Date(now).toISOString());
  return {...issue,health:'paused'};
 }
 let state;
 try{state=masterState(await client.workflowRuns(MASTER_FILE),now);}
 catch{state={status:'unknown',reason:'github_read_unavailable'};}
 const body=[
  'Independent Safety Monitor at '+new Date(now).toISOString(),
  'Master: '+MASTER_FILE,
  'Current state: '+state.status,
  'Reason: '+state.reason,
  'Most recent scheduled run ID: '+(state.runId||'none'),
  'UTC created_at: '+(state.createdAt||'unknown'),
  'Elapsed minutes: '+(state.ageMinutes??'unknown'),
  'Only GitHub event=schedule on main is considered. Push and workflow_dispatch are not substitutes.',
  'Master automatically schedules real bounded W02/W01/W03/W05/W06 work, due-gated to the existing four-hour provider cadence.',
  'GSC, Safety and Quality run on their own schedules and do not depend on this Master.',
  'No forced production run, paid model, credential readout or database write was made by the watchdog.'
 ].join('\n');
 if(state.status==='failed'||state.status==='stale')
  return {...await client.upsertIssue({title:MASTER_ISSUE,body,label:'watchdog'}),health:state.status};
 if(state.status==='healthy')
  return {...await client.resolveIssue(MASTER_ISSUE,body+'\nA genuine scheduled Master run succeeded.'),health:'healthy'};
 return {result:'unknown_or_in_progress',health:state.status,reason:state.reason};
}
if(require.main===module){
 (async()=>{
  const mode=process.argv.find(a=>a.startsWith('--mode='))?.slice(7)||'watchdog';
  const event=process.env.GITHUB_EVENT_PATH?
   JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')):{};
  const client=createClient({
   repository:process.env.GITHUB_REPOSITORY,token:process.env.GH_TOKEN,
   pauseVarSnapshot:{
    V3_MASTER_PAUSED:process.env.V3_MASTER_PAUSED??'',
    MARKET_RADAR_PAUSED:process.env.MARKET_RADAR_PAUSED??'',
    LLM_INDEX_PAUSED:process.env.LLM_INDEX_PAUSED??'',
    AUTODEV_PAUSED:process.env.AUTODEV_PAUSED??''
   }
  });
  const answer=await reconcile(client,{mode,event,now:Date.now()});
  console.log('[V3_MASTER_WATCHDOG] '+JSON.stringify(answer));
 })().catch(e=>{
  console.error('[V3_MASTER_WATCHDOG] '+String(e.message).slice(0,120));process.exitCode=1;
 });
}
module.exports={MASTER_FILE,MASTER_ISSUE,GRACE_MS,masterState,trustedCompletion,reconcile};
