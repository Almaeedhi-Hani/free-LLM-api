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
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
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
  report.warnings.push('Live preview only: not persisted, not scheduled, and not delivery-verified');
  return NextResponse.json({report},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('weekly report read failed',error);return NextResponse.json({error:'report_sources_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
