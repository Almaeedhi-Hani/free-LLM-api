#!/usr/bin/env node
'use strict';
/*
 * Phase-2 read-only watchdog, failure issue dedup and weekly truthful review.
 * GitHub Actions calls this using only its existing GITHUB_TOKEN and GEO API key.
 * Never dispatches production work, invokes models, or modifies Supabase.
 */
const assert = require('node:assert/strict');
const WORKFLOWS = Object.freeze({
  W01: 'geo-analysis.yml',
  W02: 'market-radar.yml',
  W03: 'geo-auto-publication-daily.yml',
  W04: 'gsc-daily-sync.yml',
  W05: 'llm-feed-optimization.yml',
  W06: 'autonomous-site-maintenance.yml',
});
const CUTOVER = Date.parse('2026-11-21T21:00:00Z');
const trim = x => String(x || '').slice(0, 180);
const ageHours = (timestamp, now) => {
  const t = Date.parse(String(timestamp || ''));
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 360000) / 10) : null;
};
function inspectWorkflow(workflow, runs, now = Date.now()) {
  assert(Object.hasOwn(WORKFLOWS, workflow), 'unknown workflow id');
  if (!Array.isArray(runs)) return { workflow, state:'unknown', reason:'runs_unavailable' };
  const scheduled = runs.filter(x => x && x.event === 'schedule' && x.head_branch === 'main');
  const successful = scheduled.filter(x => x.status === 'completed' && x.conclusion === 'success')
    .sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const latest = scheduled.slice().sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const maxAgeHours = now < CUTOVER ? 4 : 8;
  const age = ageHours(successful?.created_at, now);
  return { workflow, state:age == null ? 'stale' : age > maxAgeHours ? 'stale' : 'ok',
    reason:age == null ? 'no_successful_schedule' : age > maxAgeHours ? 'over_twice_expected_interval' : 'within_cadence',
    age_hours:age, max_age_hours:maxAgeHours, last_success_id:successful?.id || null,
    last_success_sha:successful?.head_sha || null, last_success_url:trim(successful?.html_url),
    last_schedule_conclusion:latest?.conclusion || 'unknown',
    last_schedule_id:latest?.id || null };
}
function inspectPersistence(workflow, snapshot, now = Date.now()) {
  const detail = snapshot?.persistence?.[workflow];
  if (workflow === 'W05' || workflow === 'W06')
    return { state:'not_applicable', reason:'verified_index_or_no_change_in_github' };
  if (!detail || typeof detail !== 'object' || !snapshot?.source)
    return { state:'unknown', reason:'storage_readback_unavailable' };
  const age = ageHours(detail.at,now);
  if (age == null) return { state:'unknown', reason:'persisted_timestamp_missing', evidence:trim(detail.evidence) };
  // A successful scheduled job is necessary but not sufficient: display DB freshness separately.
  // No due GSC measurement day, unchanged editorial policy, or no eligible candidates
  // may legitimately leave a row old. Stale evidence is a REVIEW warning, not false success.
  const maxAge = workflow === 'W04' ? 48 : 24;
  return { state:age > maxAge ? 'review' : 'observed', reason:age > maxAge ? 'persistence_older_than_review_window' : 'persisted_recently',
    age_hours:age, evidence:trim(detail.evidence), reported_status:trim(detail.status) };
}
function safeReport(workflows, snapshot, now = Date.now()) {
  const labels = Object.keys(WORKFLOWS);
  const rows = labels.map(id => {
    const item=workflows[id] || {state:'unknown',reason:'missing'};
    const db=inspectPersistence(id,snapshot,now);
    return '- '+id+' ('+WORKFLOWS[id]+'): schedule='+item.state+
      ', age_h='+(item.age_hours ?? 'unknown')+', run='+(item.last_success_id ?? 'none')+
      ', saved='+db.state+' ['+db.reason+']';
  });
  const gsc=snapshot?.gsc || {};
  return [
    '## V3 weekly evidence (safe aggregated values only)',
    'Generated UTC: '+new Date(now).toISOString(),
    ...rows,
    '',
    '### Source-quality and measurement',
    '- GSC last measured date: '+trim(gsc.latest_metric_date || 'unknown')+
      ', last outcome='+trim(gsc.latest_outcome || 'unknown')+
      ', fetched rows='+(Number.isInteger(gsc.rows_fetched)?gsc.rows_fetched:'unknown'),
    '- Accepted/rejected keyword totals: unknown until a verified persisted classification breakdown is available.',
    '- V3 Evals: inspect the latest exact-head regression workflow; never infer from a model answer.',
    '- AI visibility: search_grounded and manual_ai_search samples **unknown** until real verified evidence is present; model_only is NOT search proof.',
    '- Free-provider daily usage: unknown until independently metered; per-run budgets alone are not daily totals.',
    '- Publication policy, legal review, production security migration and AI sampling remain owner-governed.',
    '',
    'Evidence source: GitHub schedule runs plus authenticated read-only Supabase aggregate endpoint.',
    'No inference here proves Google indexing, organic ranking, AI citations or client conversion.',
  ].join('\n').slice(0,11500);
}
async function jsonFetch(fetchImpl,url,options) {
  const res=await fetchImpl(url,{...options,signal:AbortSignal.timeout(14000)});
  if (!res.ok) throw Error('upstream_status_'+res.status);
  return res.json();
}
function githubApi(fetchImpl,token,repo,path,method='GET',body) {
  return jsonFetch(fetchImpl,'https://api.github.com/repos/'+repo+path,{
    method,headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,
      'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
}
async function readSnapshot(fetchImpl,env) {
  if (!env.GEO_API_URL || !env.GEO_API_KEY) return null;
  const base=String(env.GEO_API_URL).replace(/\/+$/,'');
  const url=base+'/api/geo/ops-health';
  try{return await jsonFetch(fetchImpl,url,{method:'GET',headers:{'x-geo-api-key':env.GEO_API_KEY}});}
  catch{return null;}
}
async function gather(fetchImpl,env,now=Date.now()) {
  const repository=env.GITHUB_REPOSITORY;
  const token=env.GITHUB_TOKEN;
  if (!/^[-\w]+\/[-\w.]+$/.test(repository||'') || !token)
    throw Error('GitHub monitor configuration missing');
  const results=await Promise.all(Object.entries(WORKFLOWS).map(async ([id,file]) => {
    const resp=await githubApi(fetchImpl,token,repository,'/actions/workflows/'+file+'/runs?event=schedule&per_page=50');
    return [id,inspectWorkflow(id,resp.workflow_runs,now)];
  }));
  const snapshot=await readSnapshot(fetchImpl,env);
  return {workflows:Object.fromEntries(results),snapshot,now};
}
function issueTitle(workflow,kind='watchdog') {
  if (!Object.hasOwn(WORKFLOWS,workflow)) throw Error('Invalid workflow');
  if (kind!=='watchdog'&&kind!=='failure')throw Error('Invalid issue kind');
  return '[V3 '+kind+'] '+workflow+' '+WORKFLOWS[workflow];
}
async function upsertIssue(fetchImpl,env,{title,body,label}) {
  if (!['watchdog','failure','weekly-report'].includes(label) ||
    typeof title!=='string' || title.length>160)throw Error('Invalid issue metadata');
  const {GITHUB_REPOSITORY:repo,GITHUB_TOKEN:token}=env;
  const api=(path,method='GET',data)=>githubApi(fetchImpl,token,repo,path,method,data);
  const open=await api('/issues?state=open&per_page=100');
  const found=Array.isArray(open)?open.find(x=>!x.pull_request&&x.title===title):null;
  if(found) return api('/issues/'+found.number,'PATCH',{body:body.slice(0,13000)});
  try{await api('/labels','POST',{name:label,color:'59636e',description:'V3 automated operational evidence'});}
  catch{/* May already exist; issue creation will fail closed if no label permission. */}
  return api('/issues','POST',{title,body:body.slice(0,13000),labels:[label]});
}
function periodEnd(now){return new Date(now).toISOString().slice(0,10);}
async function execute({fetchImpl=fetch,env=process.env,now=Date.now(),mode='watchdog',dryRun=false}={}) {
  if(mode==='failure') {
    const id=String(env.FAILED_WORKFLOW_ID||'');
    if(!Object.hasOwn(WORKFLOWS,id)) throw Error('Failure alert source not allowlisted');
    const run=String(env.FAILED_RUN_ID||'');
    if(!/^\d{1,18}$/.test(run))throw Error('Invalid run ID');
    const body='Failure of '+id+' at '+new Date(now).toISOString()+
      '\nRun: https://github.com/'+env.GITHUB_REPOSITORY+'/actions/runs/'+run+
      '\nRequires manual investigation; no workflow dispatch or retry performed.';
    if(dryRun)return {mode,body,dryRun:true};
    await upsertIssue(fetchImpl,env,{title:issueTitle(id,'failure'),body,label:'failure'});
    return {mode,issue_updated:true};
  }
  if(!['watchdog','weekly'].includes(mode))throw Error('Unknown mode');
  const {workflows,snapshot}=await gather(fetchImpl,env,now);
  const body=safeReport(workflows,snapshot,now);
  const stale=Object.values(workflows).filter(x=>x.state==='stale');
  if(!dryRun){
    if(mode==='watchdog'){
      for(const status of stale){
        await upsertIssue(fetchImpl,env,{
          title:issueTitle(status.workflow),label:'watchdog',
          body:body+'\n\n**Alert:** '+status.workflow+' '+status.reason,
        });
      }
      if(!snapshot)await upsertIssue(fetchImpl,env,{
        title:'[V3 watchdog] persistence aggregate unavailable',label:'watchdog',
        body:body+'\n\nRead-only Supabase aggregate endpoint unavailable or not configured.',
      });
    }else{
      await upsertIssue(fetchImpl,env,{
        title:'[V3 weekly-report] '+periodEnd(now),body,label:'weekly-report',
      });
    }
  }
  return {mode,dryRun,stale:stale.map(x=>x.workflow),persistence:!!snapshot,body};
}
if(require.main===module){
  const mode=process.argv.find(s=>s.startsWith('--mode='))?.split('=')[1]||'watchdog';
  const dryRun=process.env.GITHUB_EVENT_NAME!=='schedule'&&process.env.ALLOW_ISSUE_WRITE!=='true';
  execute({mode,dryRun}).then(result=>{
    console.log('[V3_MONITOR] '+JSON.stringify({mode:result.mode,dry_run:result.dryRun,stale:result.stale,persistence:result.persistence}));
    if(result.body)console.log(result.body);
  }).catch(e=>{console.error('[V3_MONITOR] failed '+String(e.message).slice(0,120));process.exitCode=1;});
}
module.exports={WORKFLOWS,CUTOVER,ageHours,inspectWorkflow,inspectPersistence,safeReport,issueTitle,execute,upsertIssue};
