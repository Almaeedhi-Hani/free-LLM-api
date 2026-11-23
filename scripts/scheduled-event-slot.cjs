'use strict';

/**
 * Resolve a GitHub scheduled event using its individual cron lane and the
 * server-recorded workflow run creation date, never the runner start time.
 * The original expressions are expanded into 12 identical UTC trigger times
 * to preserve their hour in github.event.schedule.
 */
const {SWITCH_UTC}=require('./scheduled-cadence-gate.cjs');
const lanes={
 market:{minute:55,hours:[0,2,4,6,8,10,12,14,16,18,20,22],postSwitchSaudiRemainder:1},
 geo:{minute:0,hours:[1,3,5,7,9,11,13,15,17,19,21,23],postSwitchSaudiRemainder:0},
 publication:{minute:50,hours:[1,3,5,7,9,11,13,15,17,19,21,23],postSwitchSaudiRemainder:0},
 llm:{minute:10,hours:[0,2,4,6,8,10,12,14,16,18,20,22],postSwitchSaudiRemainder:1},
 maintenance:{minute:35,hours:[0,2,4,6,8,10,12,14,16,18,20,22],postSwitchSaudiRemainder:1},
};
function parseUtcDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
  throw Error('Invalid scheduled run creation timestamp');
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||date.toISOString()!==(value.endsWith('.000Z')?value:value.replace(/Z$/,'.000Z')))
  throw Error('Invalid scheduled run creation timestamp');
 return date;
}
function eventSlot(kind,cron,createdAt){
 const lane=lanes[kind];
 if(!lane)throw Error('Unknown scheduled lane');
 const found=/^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(cron||'');
 if(!found)throw Error('Invalid scheduled cron lane');
 const minute=Number(found[1]),hour=Number(found[2]);
 if(minute!==lane.minute||!lane.hours.includes(hour))throw Error('Unexpected scheduled cron lane');
 const created=parseUtcDate(createdAt);
 const nominal=new Date(created);
 nominal.setUTCHours(hour,minute,0,0);
 // GitHub may start late; use immutable run.created_at to anchor the day.
 if(nominal.getTime()>created.getTime())nominal.setUTCDate(nominal.getUTCDate()-1);
 // More than a calendar day of GitHub event delay cannot be distinguished
 // from the previous day's identical cron; fail safely instead of guessing.
 if(created.getTime()-nominal.getTime()>24*3600*1000)
  throw Error('Scheduled cron slot cannot be safely recovered');
 const afterSwitch=nominal.getTime()>=Date.parse(SWITCH_UTC);
 const ksaHour=(hour+3)%24;
 const allowed=!afterSwitch||ksaHour%4===lane.postSwitchSaudiRemainder;
 return {instant:nominal.toISOString(),allowed,kind};
}
// Production Master ticks every 15 minutes. Only due four-hour lanes may
// call real providers or publish. This preserves original free quotas/caps;
// the 10-minute scheduler is real production orchestration, not mocked tests.
const PRODUCTION_MASTER_CRON='*/15 * * * *';
// W02 alone: scheduler delivery is frequent, but real provider requests remain
// restricted to a single non-round-minute trigger in each approved 4h window.
const INDEPENDENT_RADAR_CRON='2,9,16,23,30,37,44,51,58 * * * *';
// Isolated owner-approved W02 reschedule: Monday 23 Nov 2026 20:09 Saudi time.
const W02_ONE_OFF_CRON='9 17 23 11 *';
const W02_ONE_OFF_UTC='2026-11-23T17:09:00.000Z';
function tenMinuteDue(kind,createdAt){
 const lane=lanes[kind];
 if(!lane)throw Error('Unknown scheduled lane');
 const created=parseUtcDate(createdAt);
 // Only the single Master tick 0-14 minutes after the OLD approved nominal
 // execution can run. Avoid 15m polling becoming repeated paid calls.
 const slot=new Date(created);
 slot.setUTCMinutes(lane.minute,0,0);
 if(slot.getTime()>created.getTime())slot.setUTCHours(slot.getUTCHours()-1);
 const age=created.getTime()-slot.getTime();
 const eligible=age>=0&&age<15*60*1000 &&
   lane.hours.includes(slot.getUTCHours()) &&
   (slot.getTime()<Date.parse(SWITCH_UTC) ||
     (slot.getUTCHours()+3)%4===lane.postSwitchSaudiRemainder);
 return {allowed:eligible,instant:eligible?slot.toISOString():null,kind};
}
function independentRadarDue(createdAt){
 const created=parseUtcDate(createdAt);
 // GitHub run.created_at does not identify which member of a multi-minute cron
 // emitted this event. Fail closed unless created in the unique :58 slot;
 // never infer an older :58 event from the subsequent :02/:09 events.
 if(created.getUTCMinutes()!==58)return {allowed:false,instant:null,kind:'market'};
 return tenMinuteDue('market',createdAt);
}
async function chooseEventSlot({kind,event,schedule,runId,attempt},lookup){
 if(event==='workflow_dispatch'||event==='push')
  return {run:true,reason:event,nominal:null};
 if(event!=='schedule')throw Error('Unexpected workflow event');
 if(!/^[1-9]\d*$/.test(String(attempt)))throw Error('Invalid run attempt');
 if(String(attempt)!=='1')return {run:false,reason:'scheduled_rerun',nominal:null};
 if(!/^[1-9]\d*$/.test(String(runId)))throw Error('Invalid workflow run ID');
 const info=await lookup('/actions/runs/'+runId);
 if(String(info?.id)!==String(runId)||info.event!=='schedule')
  throw Error('Scheduled run metadata does not match GitHub event');
 if(kind==='market'&&schedule===W02_ONE_OFF_CRON){
  const created=parseUtcDate(info.created_at);
  const age=created.getTime()-Date.parse(W02_ONE_OFF_UTC);
  // Accept GitHub's delayed schedule once, but never activate outside the one-day probe.
  const allowed=age>=0&&age<6*60*60*1000;
  return {run:allowed,reason:allowed?'w02_2009_one_off':'w02_2009_expired',nominal:allowed?W02_ONE_OFF_UTC:null};
 }
 if(kind==='market'&&schedule===INDEPENDENT_RADAR_CRON){
  const slot=independentRadarDue(info.created_at);
  return {run:slot.allowed,reason:slot.allowed?'radar_due':'radar_not_due',nominal:slot.instant};
 }
 if(schedule===PRODUCTION_MASTER_CRON){
  const slot=tenMinuteDue(kind,info.created_at);
  return {run:slot.allowed,reason:slot.allowed?'production_due':'production_not_due',nominal:slot.instant};
 }
 const slot=eventSlot(kind,schedule,info.created_at);
 return {run:slot.allowed,reason:slot.allowed?'scheduled_slot':'four_hour_half_slot',nominal:slot.instant};
}
async function main(env,args=process.argv.slice(2)){
 const kindArg=args.find(v=>v.startsWith('--kind='));
 const kind=kindArg?.slice(7);
 if(!lanes[kind])throw Error('Missing valid --kind=market|geo|publication|llm|maintenance');
 const fetchJson=async path=>{
  const {GITHUB_API_URL,GITHUB_REPOSITORY,GH_TOKEN}=env;
  if(!GITHUB_API_URL||!GITHUB_REPOSITORY||!GH_TOKEN)
   throw Error('Missing GitHub run-metadata scope');
  const response=await fetch(GITHUB_API_URL+'/repos/'+GITHUB_REPOSITORY+path,{
   headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+GH_TOKEN},
   redirect:'error',signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw Error('Scheduled run metadata lookup HTTP '+response.status);
  return response.json();
 };
 const answer=await chooseEventSlot({
  kind,event:env.GITHUB_EVENT_NAME,schedule:env.CADENCE_EVENT_CRON,
  runId:env.GITHUB_RUN_ID,attempt:env.GITHUB_RUN_ATTEMPT
 },fetchJson);
 const {appendFile}=require('node:fs/promises');
 if(!env.GITHUB_OUTPUT)throw Error('Missing GITHUB_OUTPUT');
 await appendFile(env.GITHUB_OUTPUT,'run='+answer.run+'\nnominal='+String(answer.nominal||'')+'\n');
 console.error('[EVENT_CADENCE] '+(answer.run?'RUN':'SKIP')+' kind='+kind+
  ' reason='+answer.reason+' nominal='+String(answer.nominal||'none'));
}
if(require.main===module){
 main(process.env).catch(error=>{
  console.error('[EVENT_CADENCE] ERROR '+error.message);
  process.exitCode=1;
 });
}
module.exports={eventSlot,chooseEventSlot,parseUtcDate,tenMinuteDue,independentRadarDue,PRODUCTION_MASTER_CRON,INDEPENDENT_RADAR_CRON,W02_ONE_OFF_CRON,W02_ONE_OFF_UTC};
