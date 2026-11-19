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
 const slot=eventSlot(kind,schedule,info.created_at);
 return {run:slot.allowed,reason:slot.allowed?'scheduled_slot':'four_hour_half_slot',nominal:slot.instant};
}
async function main(env,args=process.argv.slice(2)){
 const kindArg=args.find(v=>v.startsWith('--kind='));
 const kind=kindArg?.slice(7);
 if(!lanes[kind])throw Error('Missing valid --kind=market|geo');
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
module.exports={eventSlot,chooseEventSlot,parseUtcDate};
