import { NextRequest,NextResponse } from 'next/server';
import {getContent} from '@/lib/content-store';
import {getSupabaseCredentials} from '@/lib/storage-mode';
const core=require('../../../../../scripts/weekly-report-core.cjs') as {buildReport:(v:any)=>any};
export const dynamic='force-dynamic';
function authorized(req:NextRequest){
 const key=process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET;
 return Boolean(key && (req.headers.get('x-admin-secret')===key || req.headers.get('x-vercel-revalidation-secret')===key));
}
async function query(table:string,select:string,filter=''){
 const c=getSupabaseCredentials();
 if(!c)throw new Error('Persistent storage unavailable');
 const response=await fetch(c.url+'/rest/v1/'+table+'?select='+encodeURIComponent(select)+filter,{
  headers:{apikey:c.key,Authorization:'Bearer '+c.key},cache:'no-store'
 });
 if(!response.ok)throw new Error(table+' read failed HTTP '+response.status);
 return response.json();
}
async function generate(){
 const content=await getContent();
  const [runs,gsc,published,ai,opportunities]=await Promise.all([
   query('analysis_runs','run_type,status,started_at,finished_at,error','&order=started_at.desc&limit=150'),
   query('gsc_daily_metrics','metric_date,dimension,clicks,impressions,position','&order=metric_date.desc&limit=500'),
   query('geo_publication_events','status,published_at,target_path','&order=published_at.desc&limit=100'),
   query('impact_ai_observations','result,observed_at,verification_status','&order=observed_at.desc&limit=100'),
   query('opportunities','title,priority,status,score','&order=score.desc&limit=10')
  ]);
  const report=core.buildReport({content});
  report.sources={runs:'analysis_runs',gsc:'gsc_daily_metrics',published:'geo_publication_events',ai:'impact_ai_observations',opportunities:'opportunities'};
  report.runSummary=Array.isArray(runs)?runs.slice(0,30):null;
  report.metrics.gsc=Array.isArray(gsc)?{sampleRows:gsc.length,clicks:gsc.reduce((n:number,r:any)=>n+Number(r.clicks||0),0),impressions:gsc.reduce((n:number,r:any)=>n+Number(r.impressions||0),0),note:'Latest 500 records; dimension-specific rows may overlap. Not a unique site-wide total.'}:null;
  report.metrics.publishedLinks=Array.isArray(published)?{sampleRows:published.length,published:published.filter((r:any)=>r.status==='published').length}:null;
  report.metrics.aiVisibility=Array.isArray(ai)?{sampleSize:ai.length,observations:ai}:null;
  report.metrics.opportunities=Array.isArray(opportunities)?opportunities:null;
  return report;
}


function dbHeaders(){const c=getSupabaseCredentials();if(!c)throw new Error('Missing persistent credentials');return {url:c.url,headers:{apikey:c.key,Authorization:'Bearer '+c.key,'Content-Type':'application/json'}};}
async function stored(week:string){
 const db=dbHeaders();
 const r=await fetch(db.url+'/rest/v1/weekly_reports?week_key=eq.'+encodeURIComponent(week)+'&select=week_key,report,generated_at,verified_at',{headers:db.headers,cache:'no-store'});
 if(!r.ok)throw new Error('weekly_reports read failed: '+r.status);
 const rows=await r.json();return rows[0]||null;
}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
  const saved=req.nextUrl.searchParams.get('saved');
  if(saved==='1'){
   const week=req.nextUrl.searchParams.get('week');
   if(!week||!/^\\d{4}-\\d{2}-\\d{2}$/.test(week))return NextResponse.json({error:'invalid_week'},{status:400});
   return NextResponse.json({saved:await stored(week)},{headers:{'Cache-Control':'private, no-store'}});
  }
  return NextResponse.json({report:await generate()},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('weekly report GET',e);return NextResponse.json({error:'report_unavailable'},{status:503});}
}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
  const report=await generate();
  const db=dbHeaders();
  const existing=await stored(report.week);
  if(existing)return NextResponse.json({saved:existing,idempotent:true},{headers:{'Cache-Control':'no-store'}});
  const r=await fetch(db.url+'/rest/v1/weekly_reports?on_conflict=week_key',{
   method:'POST',headers:{...db.headers,Prefer:'resolution=ignore-duplicates,return=minimal'},
   body:JSON.stringify({week_key:report.week,report,generated_at:report.generatedAt}),cache:'no-store'
  });
  if(!r.ok)throw new Error('Weekly report save failed: '+r.status);
  const verified=await stored(report.week);
  if(!verified||verified.report?.week!==report.week)throw new Error('Weekly report readback verification failed');
  const vr=await fetch(db.url+'/rest/v1/weekly_reports?week_key=eq.'+encodeURIComponent(report.week),{
   method:'PATCH',headers:{...db.headers,Prefer:'return=minimal'},
   body:JSON.stringify({verified_at:new Date().toISOString()}),cache:'no-store'
  });
  if(!vr.ok)throw new Error('Weekly report verification marker failed');
  return NextResponse.json({saved:await stored(report.week),idempotent:false},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('weekly report POST',e);return NextResponse.json({error:'report_save_or_verification_failed'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
