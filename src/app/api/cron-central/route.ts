import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// One centrally controlled five-minute Supabase clock; all UTC slots are fixed.
const REPO = 'Almaeedhi-Hani/free-LLM-api';
const GITHUB_ROOT = 'https://api.github.com/repos/' + REPO;
type Task = 'W02'|'master'|'W04'|'safety'|'quality';
const stages: Readonly<Record<Exclude<Task,'W02'>,{workflow:string;inputs?:Record<string,string>}>> = {
  master:{workflow:'v3-production-orchestrator.yml',inputs:{source:'supabase'}},
  W04:{workflow:'gsc-daily-sync.yml'},
  safety:{workflow:'v3-phase2-safety-monitor.yml',inputs:{mode:'watchdog'}},
  quality:{workflow:'v3-stage2-quality-watch.yml',inputs:{mode:'live'}}
};
const marketHours=[2,6,10,14,18,22];
const geoHours=[3,7,11,15,19,23];
const gscHours=[0,4,8,12,16,20];

function dueTasks(instant:Date):Task[]{
  const h=instant.getUTCHours(),m=instant.getUTCMinutes();
  const out:Task[]=[];
  if(m===55&&marketHours.includes(h))out.push('W02');
  if(m===0&&geoHours.includes(h))out.push('master');
  if(m===45&&gscHours.includes(h))out.push('W04');
  if(m===20&&h%6===0)out.push('safety');
  if(m===25&&h===4)out.push('quality');
  return out;
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
async function dispatchGitHub(task:Exclude<Task,'W02'>,token:string){
  const item=stages[task];
  const r=await fetch(GITHUB_ROOT+'/actions/workflows/'+item.workflow+'/dispatches',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:JSON.stringify({ref:'main',...(item.inputs?{inputs:item.inputs}:{})}),
    signal:AbortSignal.timeout(14000),redirect:'error',cache:'no-store'
  });
  if(r.status!==204)throw new Error(task+': github_dispatch_http_'+r.status);
  return {task,status:'accepted',workflow:item.workflow};
}
async function recentRadarCompleted():Promise<boolean>{
  const base=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)throw new Error('radar_readback_credentials_missing');
  const since=new Date(Date.now()-4*3600_000).toISOString();
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
    now:new Date().toISOString()
  });
  if(mode!=='tick'&&mode!=='one_test')return NextResponse.json({error:'invalid_mode'},{status:400});
  // The caller must never create a central schedule before all required dispatch credentials exist.
  if(!token||token.length<24)return NextResponse.json({status:'blocked',reason:'github_dispatch_token_missing'},{status:503});
  const tasks:Task[]=mode==='one_test'?['W02','master','W04','safety','quality']:
    dueTasks(new Date());
  if(!tasks.length)return NextResponse.json({status:'idle',due:[],now:new Date().toISOString()});
  // No retries: uncertain 204 responses cannot be dispatched twice safely.
  const results:unknown[]=[];
  for(const task of tasks){
    try{results.push(task==='W02'?await callRadar():await dispatchGitHub(task,token));}
    catch(e){results.push({task,status:'error',reason:e instanceof Error?e.message:'failed'});}
  }
  const failed=results.some(x=>(x as {status?:string}).status==='error');
  return NextResponse.json({status:failed?'partial_failure':'accepted',results},
    {status:failed?502:200,headers:{'cache-control':'no-store'}});
}
