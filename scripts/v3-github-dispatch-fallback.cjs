'use strict';
// Optional external five-minute scheduler -> GitHub workflow_dispatch.
// This module is NOT scheduled or deployed by a repository merge alone.
// No AI calls, DB access, publishing, secrets in logs, or dynamic URL routing.
const REPO='Almaeedhi-Hani/free-LLM-api';
const WORKFLOW='v3-production-orchestrator.yml';
const ROOT='https://api.github.com/repos/'+REPO;
const LOOKBACK_MS=4*60*1000;
const ACTIVE_MS=45*60*1000;
function shouldDispatch(runs,now=Date.now()){
 if(!Number.isFinite(now)||!Array.isArray(runs))throw Error('Unverified run evidence');
 if(runs.length>25)throw Error('Unexpected workflow run page size');
 for(const r of runs){
  if(!r||typeof r!=='object'||!['schedule','workflow_dispatch','push'].includes(r.event)||
    typeof r.created_at!=='string'||!Number.isFinite(Date.parse(r.created_at))||
    typeof r.status!=='string'||typeof r.head_branch!=='string')
   throw Error('Untrusted workflow run metadata');
  if(r.head_branch!=='main')continue;
  const age=now-Date.parse(r.created_at);
  if(age<-120000)throw Error('Workflow clock is in the future');
  if(age>=0&&age<LOOKBACK_MS)return {dispatch:false,reason:'recent_master_run'};
  if(age>=0&&age<ACTIVE_MS&&['queued','requested','waiting','in_progress','pending'].includes(r.status))
   return {dispatch:false,reason:'master_still_active'};
 }
 return {dispatch:true,reason:'no_recent_master'};
}
async function run({env=process.env,fetchFn=fetch,now=Date.now(),log=console.log}={}){
 const token=env.V3_GITHUB_DISPATCH_TOKEN;
 if(typeof token!=='string'||token.length<24)throw Error('Dispatch credential missing');
 if(env.V3_MASTER_PAUSED==='true')return {status:'skipped',reason:'master_paused'};
 const headers={
  Accept:'application/vnd.github+json',
  Authorization:'Bearer '+token,
  'X-GitHub-Api-Version':'2022-11-28'
 };
 const controller=(ms)=>AbortSignal.timeout(ms);
 const response=await fetchFn(ROOT+'/actions/workflows/'+WORKFLOW+'/runs?per_page=25',{
  headers,method:'GET',redirect:'error',signal:controller(12000)
 });
 if(response?.status!==200)throw Error('GitHub run preflight failed HTTP '+(response?.status||'unknown'));
 const body=await response.json();
 if(!Array.isArray(body?.workflow_runs))throw Error('Invalid GitHub workflow metadata');
 const decision=shouldDispatch(body.workflow_runs,now);
 if(!decision.dispatch)return {status:'skipped',reason:decision.reason};
 const result=await fetchFn(ROOT+'/actions/workflows/'+WORKFLOW+'/dispatches',{
  headers:{...headers,'Content-Type':'application/json'},
  method:'POST',redirect:'error',signal:controller(12000),
  body:JSON.stringify({ref:'main'})
 });
 if(result?.status!==204)throw Error('GitHub workflow dispatch failed HTTP '+(result?.status||'unknown'));
 log('[V3_FALLBACK] dispatch=accepted, workflow='+WORKFLOW+'; source=external_cron (NOT event=schedule)');
 return {status:'dispatched',reason:'fallback_event'};
}
if(require.main===module){
 run().then(out=>console.log('[V3_FALLBACK] '+JSON.stringify(out))).catch(e=>{
  console.error('[V3_FALLBACK] ERROR '+String(e.message).slice(0,110));process.exitCode=1;
 });
}
module.exports={REPO,WORKFLOW,ROOT,LOOKBACK_MS,ACTIVE_MS,shouldDispatch,run};
