'use strict';

/**
 * V3 Stage 2 monitoring. Reads GitHub Actions and (when configured) Supabase.
 * Never dispatches production jobs, runs AI, publishes content, or changes policy.
 */
const fs = require('node:fs');

const WORKFLOWS = Object.freeze([
  { id: 'W01', filename: 'geo-analysis.yml', name: 'GEO' },
  { id: 'W02', filename: 'market-radar.yml', name: 'Market Radar' },
  { id: 'W03', filename: 'geo-auto-publication-daily.yml', name: 'GEO publisher' },
  { id: 'W04', filename: 'gsc-daily-sync.yml', name: 'Search Console' },
  { id: 'W05', filename: 'llm-feed-optimization.yml', name: 'LLM Index' },
  { id: 'W06', filename: 'autonomous-site-maintenance.yml', name: 'Bounded maintenance' },
]);
const LEGACY_PAUSE_VARS=Object.freeze({W02:'MARKET_RADAR_PAUSED',W05:'LLM_INDEX_PAUSED',W06:'AUTODEV_PAUSED'});
const POSTGREST_READS = Object.freeze({
  W01: {table:'content_store',time:'updated_at',query:'select=updated_at&order=updated_at.desc&limit=1'},
  W02: {table:'analysis_runs',time:'finished_at',query:'select=finished_at&run_type=eq.radar&status=eq.success&order=finished_at.desc&limit=1'},
  W03: {table:'audit_logs',time:'created_at',query:'select=created_at&action=eq.geo_publication_rpc_result&metadata->>source_workflow=eq.W03&order=created_at.desc&limit=1'},
  W04: {table:'gsc_sync_day_outcomes',time:'checked_at',query:'select=checked_at&order=checked_at.desc&limit=1'},
});
function expectedIntervalHours(utcMillis) {
  // Nov 22 00:00 Asia/Riyadh is Nov 21 21:00 UTC.
  return utcMillis >= Date.parse('2026-11-21T21:00:00Z') ? 4 : 2;
}
function classifyRuns(runs, nowMillis, thresholdFactor=2) {
  if (!Array.isArray(runs)) return {status:'unknown',reason:'runs_unavailable'};
  const scheduled=runs.filter(r=>r && r.event==='schedule' && r.head_branch==='main');
  const successes=scheduled.filter(r=>r.status==='completed' && r.conclusion==='success')
    .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
  const latest=successes[0];
  const active=scheduled.some(r=>r.status==='in_progress'||r.status==='queued'||r.status==='waiting');
  const intervalHours=expectedIntervalHours(nowMillis);
  if (!latest) return {status:active?'pending':'stale',reason:active?'first_run_pending':'no_successful_schedule',intervalHours,runId:null,ageHours:null};
  const ageHours=(nowMillis-Date.parse(latest.created_at))/3600000;
  if (!Number.isFinite(ageHours)||ageHours<0) return {status:'unknown',reason:'invalid_schedule_timestamp',runId:latest.id};
  if (ageHours > intervalHours*thresholdFactor && !active) {
    return {status:'stale',reason:'schedule_older_than_twice_interval',intervalHours,ageHours:+ageHours.toFixed(2),runId:latest.id,url:latest.html_url};
  }
  return {status:active?'pending':'healthy',reason:active?'new_run_in_progress':'scheduled_success',intervalHours,ageHours:+ageHours.toFixed(2),runId:latest.id,url:latest.html_url};
}
function weeklyKey(nowMillis) {
  // Fixed Sunday-start week in Saudi Arabia, stable regardless of runner locale.
  const date=new Date(nowMillis+3*3600000);
  date.setUTCHours(0,0,0,0);
  date.setUTCDate(date.getUTCDate()-date.getUTCDay());
  return date.toISOString().slice(0,10);
}
function issueKey(category, workflowId) {
  if (category==='weekly') return '[V3 weekly] ' + workflowId;
  return '[V3 ' + category + '] ' + workflowId;
}
function safeOutcome(value) {
  return ['success','failure','timed_out','cancelled','action_required','startup_failure','skipped'].includes(value) ? value : 'unknown';
}
function formatUtc(ms) {return new Date(ms).toISOString();}
function createClient({repository,token,fetchImpl=fetch,pauseVarSnapshot=null}) {
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository)||!token) throw Error('Missing GitHub repository or token');
  async function github(path, options={}) {
    const response=await fetchImpl('https://api.github.com/repos/'+repository+path,{
      ...options,
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
        ...(options.body?{'Content-Type':'application/json'}:{})},
    });
    if(!response.ok) throw Error('GitHub '+response.status+' '+path.split('?')[0]);
    return response.status===204?{}:response.json();
  }
  // GitHub issue list visibility can lag behind successful POST /issues.
  // Cache our own open Issue IDs for the remainder of this single monitor job.
  // The workflow-level concurrency group separately serializes jobs on GitHub.
  const locallyOpenedIssues=new Map();
  async function ensureLabel(label) {
    const color=label==='failure'?'cf222e':label==='watchdog'?'fb8500':'0e8a16';
    try{await github('/labels',{method:'POST',body:JSON.stringify({name:label,color})});}
    catch(error){if(!String(error.message).includes('GitHub 422'))throw error;}
  }
  async function findOpenIssue(title) {
    const local=locallyOpenedIssues.get(title);
    if(local)return local;
    for(let page=1;page<=5;page++){
      const issues=await github('/issues?state=open&per_page=100&page='+page);
      const match=issues.find(i=>!i.pull_request&&i.title===title);
      if(match) {
        locallyOpenedIssues.set(title,match);
        return match;
      }
      if(issues.length<100)break;
    }
    return null;
  }
  async function upsertIssue({title,body,label}) {
    const previous=await findOpenIssue(title);
    if(previous) {
      if(previous.body!==body) {
        await github('/issues/'+previous.number,{method:'PATCH',body:JSON.stringify({body})});
        locallyOpenedIssues.set(title,{...previous,body});
      }
      return {result:'updated',number:previous.number};
    }
    await ensureLabel(label);
    const created=await github('/issues',{method:'POST',body:JSON.stringify({title,body,labels:[label]})});
    if(!Number.isInteger(created.number)||created.number<1)
      throw Error('GitHub Issue creation did not return a valid number');
    locallyOpenedIssues.set(title,{number:created.number,title,body});
    return {result:'created',number:created.number};
  }
  async function resolveIssue(title,body) {
    const existing=await findOpenIssue(title);
    if(!existing)return {result:'none'};
    await github('/issues/'+existing.number,{method:'PATCH',body:JSON.stringify({state:'closed',body})});
    locallyOpenedIssues.delete(title);
    return {result:'resolved',number:existing.number};
  }
  async function workflowRuns(filename) {
    // Fetch 100 recent *scheduled* runs, not push/dispatch results.
    const value=await github('/actions/workflows/'+encodeURIComponent(filename)+'/runs?event=schedule&per_page=100');
    return value.workflow_runs;
  }
  async function pauseStatus(id) {
    // Prefer the trusted GitHub Actions vars context injected by the workflow.
    // GITHUB_TOKEN does not necessarily have Administration:read for the
    // repository Variables REST endpoint. No additional token scope is needed.
    const names=['V3_MASTER_PAUSED',...(LEGACY_PAUSE_VARS[id]?[LEGACY_PAUSE_VARS[id]]:[])];
    if (pauseVarSnapshot !== null) {
      if (!pauseVarSnapshot || !names.every(name=>Object.hasOwn(pauseVarSnapshot,name)))
        return {status:'unknown',reason:'pause_context_incomplete'};
      const selected=names.find(name=>pauseVarSnapshot[name]==='true');
      return selected ? {status:'paused',reason:selected} : {status:'active',reason:'no_pause_requested'};
    }
    // Retain the conservative REST fallback for non-Actions callers. An API
    // permission error is unknown, never mistaken for a healthy active run.
    for(const name of names) {
      let current;
      try {current=await github('/actions/variables/'+name);}
      catch(error){
        if(String(error.message).includes('GitHub 404'))continue;
        return {status:'unknown',reason:'pause_variable_unreadable'};
      }
      if(current.value==='true')return {status:'paused',reason:name};
    }
    return {status:'active',reason:'no_pause_requested'};
  }
  return {github,workflowRuns,pauseStatus,upsertIssue,resolveIssue};
}
async function readStorage(id,{url,key,fetchImpl=fetch}) {
  const selection=POSTGREST_READS[id];
  if(!selection)return {status:'not_applicable',note:'Index or maintenance can legitimately be no_change'};
  if(!url||!key)return {status:'unknown',note:'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured for read-only monitor'};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))return {status:'unknown',note:'Invalid Supabase URL'};
  try {
    const response=await fetchImpl(url.replace(/\/$/,'')+'/rest/v1/'+selection.table+'?'+selection.query,{
      headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'},signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)return {status:'unknown',note:'readback_http_'+response.status};
    const body=await response.json();
    if(!Array.isArray(body)||body.length===0)return {status:'unknown',note:'no_existing_rows'};
    const value=body[0][selection.time];
    if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return {status:'unknown',note:'missing_storage_timestamp'};
    return {status:'observed',latestTimestamp:value,source:selection.table};
  }catch{return {status:'unknown',note:'readback_error'};}
}

/**
 * A green scheduled job does not prove that its output was stored. W01-W04
 * have persisted readbacks; W05/W06 can legitimately be no_change. Unknown
 * or invalid database reads never become fabricated healthy evidence.
 */
function persistedFreshness(storage,nowMillis) {
  if(storage?.status==='not_applicable')return {status:'not_applicable',reason:'legitimate_no_change_possible'};
  if(storage?.status!=='observed')return {status:'unknown',reason:'storage_readback_unverified'};
  const saved=Date.parse(storage.latestTimestamp);
  if(!Number.isFinite(saved)||!Number.isFinite(nowMillis)||saved>nowMillis)
    return {status:'unknown',reason:'invalid_persisted_timestamp'};
  const ageHours=(nowMillis-saved)/3600000;
  const limitHours=2*expectedIntervalHours(nowMillis);
  return {status:ageHours>limitHours?'stale':'fresh',
    reason:ageHours>limitHours?'persisted_output_older_than_twice_interval':'recent_persisted_output',
    ageHours:+ageHours.toFixed(2),limitHours};
}

/**
 * Only the GSC total grain is measured here. Other grains duplicate the
 * same impressions; summing page, query, device and country would inflate
 * observed organic performance. No external Search Console request is made.
 */
async function readGscMeasured({url,key,fetchImpl=fetch}) {
  if(!url||!key)return {status:'unknown',note:'measurement_credentials_unavailable'};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))
    return {status:'unknown',note:'invalid_measurement_storage_url'};
  try {
    const query='select=metric_date,impressions,clicks&dimension=eq.total&order=metric_date.desc&limit=7';
    const response=await fetchImpl(url.replace(/\/$/,'')+'/rest/v1/gsc_daily_metrics?'+query,{
      headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'},
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)return {status:'unknown',note:'measurement_http_'+response.status};
    const rows=await response.json();
    if(!Array.isArray(rows)||!rows.length)return {status:'unknown',note:'measurement_total_rows_absent'};
    const seen=new Set();
    for(const row of rows) {
      if(!row||typeof row.metric_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.metric_date)||
         seen.has(row.metric_date)||row.impressions===null||row.impressions===undefined||
         row.clicks===null||row.clicks===undefined)
        return {status:'unknown',note:'measurement_rows_invalid'};
      const impressions=Number(row.impressions),clicks=Number(row.clicks);
      if(!Number.isFinite(impressions)||!Number.isFinite(clicks)||impressions<0||clicks<0||clicks>impressions)
        return {status:'unknown',note:'measurement_rows_invalid'};
      seen.add(row.metric_date);
    }
    const latest=rows[0];
    return {status:'observed',grain:'total',latestDate:latest.metric_date,
      impressions:Number(latest.impressions),clicks:Number(latest.clicks),observedDays:seen.size};
  }catch{return {status:'unknown',note:'measurement_readback_error'};}
}
function gscSummaryLine(gsc) {
  if(gsc.status!=='observed')
    return '- GSC measured organic performance: unknown ('+(gsc.note||'unavailable')+'). No invented impressions or clicks.';
  return '- GSC measured Search Console (total grain only): '+gsc.latestDate+
    ', '+gsc.impressions+' impressions, '+gsc.clicks+' clicks; '+gsc.observedDays+
    ' distinct measured dates inspected. This does not prove indexing or a specific SERP rank.';
}


async function readWeeklyEvidence({url,key,now,fetchImpl=fetch}) {
  const unknown=(reason)=>({status:'unknown',reason});
  const result={feedback:unknown('not_checked'),page:unknown('not_checked')};
  if(!url||!key)return {feedback:unknown('credentials_unavailable'),page:unknown('credentials_unavailable')};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)||!Number.isFinite(now))
    return {feedback:unknown('invalid_configuration'),page:unknown('invalid_configuration')};
  const cutoff=new Date(now-7*86400000).toISOString();
  const headers={apikey:key,Authorization:'Bearer '+key,Accept:'application/json'};
  async function load(table,query) {
    const r=await fetchImpl(url.replace(/\/$/,'')+'/rest/v1/'+table+'?'+query,{
      headers,signal:AbortSignal.timeout(12000)
    });
    if(!r.ok)throw Error('readback_http_'+r.status);
    const rows=await r.json();
    if(!Array.isArray(rows))throw Error('invalid_json_rows');
    return rows;
  }
  try {
    const query='select=subject_type,decision,created_at&subject_type=eq.keyword&created_at=gte.'+
      encodeURIComponent(cutoff)+'&order=created_at.desc&limit=501';
    const rows=await load('geo_agent_feedback',query);
    if(rows.length>500)throw Error('feedback_truncated');
    const counts={relevant:0,irrelevant:0,approved:0,rejected:0,accepted:0,needs_review:0,other:0};
    for(const row of rows) {
      const date=Date.parse(row?.created_at);
      if(row?.subject_type!=='keyword'||typeof row.decision!=='string'||
        !Number.isFinite(date)||date<Date.parse(cutoff)||date>now)throw Error('feedback_invalid_row');
      counts[Object.hasOwn(counts,row.decision)?row.decision:'other']++;
    }
    result.feedback={status:'observed',sampleSize:rows.length,counts,from:cutoff.slice(0,10)};
  }catch(error){result.feedback=unknown(String(error.message).slice(0,64));}
  try {
    const since=cutoff.slice(0,10);
    const query='select=metric_date,dimension_value,impressions,clicks,position&dimension=eq.page&metric_date=gte.'+
      since+'&order=impressions.desc,metric_date.desc&limit=5';
    const rows=await load('gsc_daily_metrics',query);
    for(const row of rows) {
      let parsed;
      try{parsed=new URL(row.dimension_value);}catch{continue;}
      if(row.impressions===null||row.impressions===undefined||
         row.clicks===null||row.clicks===undefined)continue;
      const impressions=Number(row.impressions),clicks=Number(row.clicks);
      const position=row.position===null||row.position===undefined?null:Number(row.position);
      if(parsed.origin!=='https://free-llm-api-1-didl.onrender.com'||parsed.search||parsed.hash||
         !/^\/[a-z0-9/_-]*$/.test(parsed.pathname)||!row.metric_date||
         !/^\d{4}-\d{2}-\d{2}$/.test(row.metric_date)||row.metric_date<since||
         row.metric_date>new Date(now).toISOString().slice(0,10)||
         !Number.isFinite(impressions)||!Number.isFinite(clicks)||impressions<0||
         clicks<0||clicks>impressions||(position!==null&&(!Number.isFinite(position)||position<0)))continue;
      result.page={status:'observed',date:row.metric_date,path:parsed.pathname,impressions,clicks,position};
      break;
    }
    if(result.page.status!=='observed')result.page=unknown('no_verified_page_day');
  }catch(error){result.page=unknown(String(error.message).slice(0,64));}
  return result;
}
function weeklyEvidenceLines(data) {
  const feedback=data.feedback,page=data.page;
  const f=feedback.status==='observed'?
    '- Recorded keyword feedback (seven days, '+feedback.sampleSize+' decisions): '+
      (Object.entries(feedback.counts).filter(([,n])=>n>0).map(([k,n])=>k+'='+n).join(', ')||'none recorded')+
      '. Historical feedback labels, not autonomous approval.' :
    '- Recorded keyword feedback: unknown ('+feedback.reason+').';
  const p=page.status==='observed'?
    '- GSC highest-impression page-day sample (not weekly total): '+page.path+' on '+
      page.date+', '+page.impressions+' impressions, '+page.clicks+' clicks, average position '+
      (page.position===null?'unknown':page.position.toFixed(1))+
      '. Small sample; this is not a live SERP rank.' :
    '- GSC page-day sample: unknown ('+page.reason+').';
  return [f,p];
}

function summaryLine(target,run,storage,nowMillis) {
  const age=run.ageHours===null||run.ageHours===undefined?'unknown':run.ageHours+'h';
  const record=storage.latestTimestamp||storage.note||'unknown';
  const freshness=persistedFreshness(storage,nowMillis);
  return '| '+target.id+' '+target.name+' | '+run.status+' | '+age+' | '+(run.runId||'none')+
    ' | '+storage.status+': '+record+' | '+freshness.status+' |';
}
async function collect(client,options) {
  const all=[];
  for(const target of WORKFLOWS) {
    let run;
    const pause=await client.pauseStatus(target.id);
    if(pause.status==='paused')run={status:'paused',reason:pause.reason};
    else if(pause.status==='unknown')run={status:'unknown',reason:pause.reason};
    else {
      try{run=classifyRuns(await client.workflowRuns(target.filename),options.now);}
      catch{run={status:'unknown',reason:'github_read_error'};}
    }
    const storage=await readStorage(target.id,{url:options.supabaseUrl,key:options.supabaseKey,fetchImpl:options.fetchImpl||fetch});
    all.push({target,run,storage});
  }
  return all;
}
async function handleWatchdog(client,rows,now) {
  const result=[];
  for(const row of rows){
    const title=issueKey('watchdog',row.target.id+' '+row.target.name+' schedule stale');
    const body='Latest assessment '+formatUtc(now)+'\n\nWorkflow: '+row.target.filename+
      '\nStatus: '+row.run.status+'\nReason: '+row.run.reason+
      '\nLast successful scheduled run: '+(row.run.runId||'unknown')+
      '\nHours since schedule: '+(row.run.ageHours??'unknown')+
      '\nStorage: '+row.storage.status+' ('+(row.storage.latestTimestamp||row.storage.note||'unknown')+')'+
      '\n\nThis monitor never dispatches a production workflow. The issue is updated, not duplicated.';
    if(row.run.status==='stale')result.push({workflow:row.target.id,...await client.upsertIssue({title,body,label:'watchdog'})});
    if(row.run.status==='healthy'||row.run.status==='paused')result.push({workflow:row.target.id,...await client.resolveIssue(title,body+'\nIncident resolved: '+(row.run.status==='paused'?'owner-requested pause':'genuine scheduled success')+'.')});

    // The second, source-backed alarm is independent of a green workflow.
    // Never alert solely because credentials are missing or a no_change
    // workflow has no storage table; such observations stay explicit unknown.
    const freshness=persistedFreshness(row.storage,now);
    if(freshness.status==='not_applicable')continue;
    const savedTitle=issueKey('watchdog',row.target.id+' '+row.target.name+' persisted output stale');
    const savedBody='Latest assessment '+formatUtc(now)+'\n\nWorkflow: '+row.target.filename+
      '\nSchedule: '+row.run.status+'\nPersistence: '+freshness.status+
      '\nReason: '+freshness.reason+'\nHours since verified save: '+(freshness.ageHours??'unknown')+
      '\nLimit hours: '+(freshness.limitHours??'unknown')+
      '\nLast observed save: '+(row.storage.latestTimestamp||row.storage.note||'unknown')+
      '\nNo provider calls, forced publishing, or synthetic records were made by the monitor.';
    if(row.run.status==='healthy'&&freshness.status==='stale')
      result.push({workflow:row.target.id,kind:'persisted_output',...await client.upsertIssue({title:savedTitle,body:savedBody,label:'watchdog'})});
    if(row.run.status==='paused'||(row.run.status==='healthy'&&freshness.status==='fresh'))
      result.push({workflow:row.target.id,kind:'persisted_output',...await client.resolveIssue(savedTitle,savedBody+
        '\nResolved: '+(row.run.status==='paused'?'owner-requested pause':'genuine schedule and recent stored output')+'.')});
  }
  return result;
}
async function handleFailure(client,event) {
  const run=event&&event.workflow_run;
  const target=WORKFLOWS.find(w=>run&&String(run.path).endsWith('/'+w.filename));
  if(!target||run.event!=='schedule'||run.head_branch!=='main'||run.head_repository?.full_name!==event.repository?.full_name)
    return {result:'ignored_untrusted_or_non_schedule'};
  const pause=await client.pauseStatus(target.id);
  if(pause.status!=='active')return {result:'ignored_paused_or_unknown',pause:pause.status};
  const title=issueKey('failure',target.id+' '+target.name+' scheduled run');
  const result=safeOutcome(run.conclusion);
  const body='Workflow: '+target.filename+'\nRun ID: '+run.id+
    '\nEvent: schedule\nConclusion: '+result+
    '\nURL: https://github.com/'+event.repository.full_name+'/actions/runs/'+run.id+
    '\nObserved at: '+new Date().toISOString()+
    '\nNo automatic retry or publication performed.';
  if(result==='success')return client.resolveIssue(title,body+'\nResolved by a successful scheduled run.');
  return client.upsertIssue({title,body,label:'failure'});
}
async function run(options) {
  const client=createClient({repository:options.repository,token:options.token,fetchImpl:options.fetchImpl||fetch,
    pauseVarSnapshot:options.pauseVarSnapshot??null});
  if(options.mode==='failure')return handleFailure(client,options.event);
  const rows=await collect(client,options);
  if(options.mode==='watchdog')return {results:await handleWatchdog(client,rows,options.now),observations:rows.map(x=>({id:x.target.id,...x.run,storage:x.storage.status,storageFreshness:persistedFreshness(x.storage,options.now)}))};
  if(options.mode==='weekly'){
    const gsc=await readGscMeasured({url:options.supabaseUrl,key:options.supabaseKey,fetchImpl:options.fetchImpl||fetch});
    const weeklyEvidence=await readWeeklyEvidence({url:options.supabaseUrl,key:options.supabaseKey,
      now:options.now,fetchImpl:options.fetchImpl||fetch});
    const title=issueKey('weekly',weeklyKey(options.now));
    const lines=rows.map(x=>summaryLine(x.target,x.run,x.storage,options.now));
    const body=['## V3 weekly operational report', 'Generated (UTC): '+formatUtc(options.now),
      'All dates are observed; missing storage or measurement remains unknown.',
      '| System | Schedule | Age | Last run | Storage readback | Storage freshness |','| --- | --- | --- | --- | --- | --- |',
      ...lines,'',
      '### Evidence and outstanding decisions',
      ...weeklyEvidenceLines(weeklyEvidence),
      '- V3 Evals: unknown until linked successful run is independently checked.',
      gscSummaryLine(gsc),
      '- AI visibility: search_grounded/manual samples unknown; model_only never counts as verified citations.',
      '- Free provider quota usage: unknown unless explicit per-provider usage is available.',
      '- Decisions: production security hardening, legal review policy, weekly sample activation.',
      '- No paid AI/search provider calls and no live publication were made by this report.'
    ].join('\n');
    return client.upsertIssue({title,body,label:'weekly-report'});
  }
  throw Error('Unknown monitor mode');
}
if(require.main===module){
  (async()=>{
    const mode=process.argv.find(a=>a.startsWith('--mode='))?.slice(7)||'watchdog';
    const event=process.env.GITHUB_EVENT_PATH?JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')):{};
    const result=await run({mode,repository:process.env.GITHUB_REPOSITORY,token:process.env.GH_TOKEN,
      now:Date.now(),supabaseUrl:process.env.SUPABASE_URL,supabaseKey:process.env.SUPABASE_SERVICE_ROLE_KEY,event,
      pauseVarSnapshot:{
        V3_MASTER_PAUSED:process.env.V3_MASTER_PAUSED??'',
        MARKET_RADAR_PAUSED:process.env.MARKET_RADAR_PAUSED??'',
        AUTODEV_PAUSED:process.env.AUTODEV_PAUSED??'',
        LLM_INDEX_PAUSED:process.env.LLM_INDEX_PAUSED??'',
      }});
    console.log('[V3_SAFETY] '+JSON.stringify(result));
  })().catch(err=>{console.error('[V3_SAFETY] '+String(err.message).slice(0,200));process.exitCode=1;});
}
module.exports={WORKFLOWS,expectedIntervalHours,classifyRuns,weeklyKey,issueKey,safeOutcome,createClient,readStorage,persistedFreshness,readGscMeasured,gscSummaryLine,readWeeklyEvidence,weeklyEvidenceLines,collect,handleFailure,handleWatchdog,run};
