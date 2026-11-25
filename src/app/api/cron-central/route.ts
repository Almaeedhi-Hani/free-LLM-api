import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {runTelegramTick} from '@/lib/telegram-ops-notifier';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// One centrally controlled three-hour Supabase clock; all UTC slots are fixed.
const REPO = 'Almaeedhi-Hani/free-LLM-api';
const GITHUB_ROOT = 'https://api.github.com/repos/' + REPO;
type Task = 'W02'|'master'|'W04'|'safety'|'quality'|'weekly';
const stages: Readonly<Record<Exclude<Task,'W02'|'weekly'>,{workflow:string;inputs?:Record<string,string>}>> = {
  master:{workflow:'v3-production-orchestrator.yml',inputs:{source:'supabase'}},
  W04:{workflow:'gsc-daily-sync.yml'},
  safety:{workflow:'v3-phase2-safety-monitor.yml',inputs:{mode:'watchdog'}},
  quality:{workflow:'v3-stage2-quality-watch.yml',inputs:{mode:'live'}}
};
const threeHourSlots=[0,3,6,9,12,15,18,21];

function dueTasks(instant:Date):Task[]{
  const h=instant.getUTCHours(),m=instant.getUTCMinutes();
  // One Supabase invocation per three-hour slot, not a five-minute polling clock.
  if(m!==0||!threeHourSlots.includes(h))return [];
  const tasks:Task[]=['W02','master','W04','safety','quality'];
  if(instant.getUTCDay()===0&&h===6)tasks.push('weekly');
  return tasks;
}
function verifySignature(req:NextRequest):boolean{
  const key=process.env.W02_SUPABASE_HMAC_SECRET||'';
  const time=req.headers.get('x-w02-cron-ts')||'';
  const sig=req.headers.get('x-w02-cron-signature')||'';
  if(!/^[a-f0-9]{64}$/i.test(key)||!/^\d{10}$/.test(time)||!/^[a-f0-9]{64}$/i.test(sig))return false;
  if(Math.abs(Math.floor(Date.now()/1000)-Number(time))>300)return false;
  const expected=createHmac('sha256',Buffer.from(key,'hex')).update('POST\n/api/cron-central\n'+time).digest();
  return timingSafeEqual(expected,Buffer.from(sig,'hex'));
}
function githubToken():string|undefined {
  return process.env.V3_GITHUB_DISPATCH_TOKEN ||
    process.env.AUTODEV_GITHUB_TOKEN || process.env.GITHUB_DISPATCH_TOKEN;
}
async function dispatchGitHub(task:Exclude<Task,'W02'|'weekly'>,token:string,slot?:string){
  const item=stages[task];
  const inputs=slot&&(task==='master'||task==='W04')?{...item.inputs,source:'supabase',central_slot:slot}:item.inputs;
  const r=await fetch(GITHUB_ROOT+'/actions/workflows/'+item.workflow+'/dispatches',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:JSON.stringify({ref:'main',...(inputs?{inputs}:{})}),
    signal:AbortSignal.timeout(14000),redirect:'error',cache:'no-store'
  });
  if(r.status!==204)throw new Error(task+': github_dispatch_http_'+r.status);
  return {task,status:'accepted',workflow:item.workflow};
}
async function saveWeeklyReport():Promise<{task:'weekly';status:string;week_key:string}>{
  const secret=process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET;
  if(!secret)throw new Error('weekly_admin_secret_missing');
  const base=process.env.NEXT_PUBLIC_SITE_URL||'https://free-llm-api-1-didl.onrender.com';
  const r=await fetch(base.replace(/\/$/,'')+'/api/admin/weekly-report',{
    method:'POST',headers:{'x-admin-secret':secret,'Content-Type':'application/json'},
    cache:'no-store',signal:AbortSignal.timeout(120000)
  });
  if(!r.ok)throw new Error('weekly_report_http_'+r.status);
  const result=await r.json() as {saved?:{week_key?:string;verified_at?:string}};
  if(!result.saved?.week_key||!result.saved?.verified_at)throw new Error('weekly_report_readback_unverified');
  return {task:'weekly',status:'verified',week_key:result.saved.week_key};
}
async function recentRadarCompleted():Promise<boolean>{
  const base=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)throw new Error('radar_readback_credentials_missing');
  const since=new Date(Date.now()-3*3600_000).toISOString();
  const url=base.replace(/\/$/,'')+'/rest/v1/analysis_runs?select=id&run_type=eq.radar&status=eq.success&started_at=gte.'+
    encodeURIComponent(since)+'&limit=1';
  const r=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!r.ok)throw new Error('radar_readback_http_'+r.status);
  const json=await r.json() as unknown;
  if(!Array.isArray(json))throw new Error('radar_readback_malformed');
  return json.length>0;
}
async function callRadar():Promise<{task:'W02';status:string;run_id?:string}>{
  if(await recentRadarCompleted())return {task:'W02',status:'skipped_recent_success'};
  const secret=process.env.CRON_SECRET;
  if(!secret)throw new Error('radar_bearer_secret_missing');
  const base=process.env.NEXT_PUBLIC_SITE_URL||'https://free-llm-api-1-didl.onrender.com';
  const r=await fetch(base.replace(/\/$/,'')+'/api/cron-market',{
    headers:{Authorization:'Bearer '+secret},cache:'no-store',
    signal:AbortSignal.timeout(240000)
  });
  if(!r.ok)throw new Error('radar_http_'+r.status);
  const json=await r.json() as {status?:string;run_id?:string};
  if(json.status!=='completed'||!json.run_id)throw new Error('radar_result_not_persisted');
  const baseDb=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!baseDb||!key)throw Error('radar_readback_credentials_missing');
  const readback=await fetch(baseDb.replace(/\/$/,'')+'/rest/v1/analysis_runs?select=id,status,finished_at&run_type=eq.radar&id=eq.'+encodeURIComponent(json.run_id)+'&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000),cache:'no-store',redirect:'error'});
  if(!readback.ok)throw Error('radar_result_readback_unavailable');
  const saved=await readback.json() as Array<{id:string;status:string;finished_at:string}>;
  if(!Array.isArray(saved)||saved.length!==1||saved[0].id!==json.run_id||saved[0].status!=='success'||!Number.isFinite(Date.parse(saved[0].finished_at)))throw Error('radar_result_readback_unverified');
  return {task:'W02',status:'completed',run_id:json.run_id};
}
export async function POST(req:NextRequest){
  if(!verifySignature(req))return NextResponse.json({error:'unauthorized'},{status:401});
  let body:{mode?:string}={};
  try{body=await req.json() as {mode?:string};}catch{return NextResponse.json({error:'invalid_body'},{status:400});}
  const mode=body.mode||'tick';
  const token=githubToken();
  if(mode==='capabilities')return NextResponse.json({status:'ok',
    githubDispatchConfigured:Boolean(token&&token.length>=24),
    radarConfigured:Boolean(process.env.CRON_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY),
    geoScheduling:'ordered_github_master_workflow_dispatch',
    cadence:'three_hours',weeklyScheduling:'Sunday 09:00 Asia/Riyadh',
    weeklyConfigured:Boolean(process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET),
    now:new Date().toISOString()
  });
  if(mode!=='tick'&&mode!=='one_test')return NextResponse.json({error:'invalid_mode'},{status:400});
  // The caller must never create a central schedule before all required dispatch credentials exist.
  if(!token||token.length<24)return NextResponse.json({status:'blocked',reason:'github_dispatch_token_missing'},{status:503});
  // Use the authenticated sender timestamp rather than request arrival time.
  // A delayed signed tick remains assigned to its original immutable slot.
  const tick=mode==='tick'?new Date(Number(req.headers.get('x-w02-cron-ts'))*1000):new Date();
  const tasks:Task[]=mode==='one_test'?['W02','master','W04','safety','quality','weekly']:
    dueTasks(tick);
  if(!tasks.length)return NextResponse.json({status:'idle',due:[],now:new Date().toISOString()});
  // No retries: uncertain 204 responses cannot be dispatched twice safely.
  // Optional notification sidecar; no new cron or production dispatch dependency.
  const telegram=mode==='tick'?runTelegramTick(new Date().toISOString()).catch(()=>({status:'monitor_unavailable'})):Promise.resolve({status:'not_requested'});
  const results:unknown[]=[];
  const slot=mode==='tick'?tick.toISOString().slice(0,13)+':00:00Z':undefined;
  for(const task of tasks){
    try{results.push(task==='W02'?await callRadar():task==='weekly'?await saveWeeklyReport():await dispatchGitHub(task,token,slot));}
    catch(e){results.push({task,status:'error',reason:e instanceof Error?e.message:'failed'});}
  }
  const failed=results.some(x=>(x as {status?:string}).status==='error');
  return NextResponse.json({status:failed?'partial_failure':'accepted',results,telegram:await telegram},
    {status:failed?502:200,headers:{'cache-control':'no-store'}});
}
