import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {buildGscStoredOpportunityReport} from '@/lib/gsc-opportunity-storage-report';
import type {GscStoredMetric,GscStoredDay} from '@/lib/gsc-opportunity-storage-report';
export const dynamic='force-dynamic';

/** Protected, read-only 28d vs 28d report. No claims without finalized days. */
export async function GET(req:NextRequest){
 const expected=process.env.ADMIN_SECRET||'';
 const provided=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(expected),b=Buffer.from(provided);
 if(!expected||a.length!==b.length||!timingSafeEqual(a,b))
  return NextResponse.json({error:'unauthorized'},{status:401});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'storage_not_configured'},{status:503});
 const property=process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/';
 const nowDay=new Date(new Date().toISOString().slice(0,10)+'T00:00:00.000Z').getTime();
 const endDate=new Date(nowDay-3*86400000).toISOString().slice(0,10);
 const firstDate=new Date(nowDay-58*86400000).toISOString().slice(0,10);
 const base=url.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:key,Authorization:'Bearer '+key,Accept:'application/json'};
 const suffix='&property=eq.'+encodeURIComponent(property)+
   '&metric_date=gte.'+firstDate+'&metric_date=lte.'+endDate;
 try{
  const metrics:GscStoredMetric[]=[];
  for(let offset=0;offset<=10000;offset+=1000){
   if(offset===10000)throw Error('gsc_report_row_ceiling');
   const endpoint=base+'gsc_daily_metrics?select=metric_date,dimension,dimension_value,clicks,impressions,ctr,position'+
     suffix+'&dimension=in.(page,query,page_query)&order=metric_date.asc,dimension.asc,dimension_value.asc'+
     '&limit=1000&offset='+offset;
   const response=await fetch(endpoint,{headers,cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('gsc_metrics_read_'+response.status);
   const page=await response.json() as GscStoredMetric[];
   if(!Array.isArray(page)||page.length>1000)throw Error('gsc_metrics_invalid_page');
   metrics.push(...page);
   if(page.length<1000)break;
  }
  const statusUrl=base+'gsc_sync_day_outcomes?select=metric_date,status,rows_fetched,checked_at'+
   suffix+'&order=metric_date.asc&limit=90';
  const statusResponse=await fetch(statusUrl,{headers,cache:'no-store',
   signal:AbortSignal.timeout(12000)});
  let dayOutcomes:GscStoredDay[]=[];
  let hasAtomicDayStore=false;
  if(statusResponse.ok){
   dayOutcomes=await statusResponse.json() as GscStoredDay[];
   if(!Array.isArray(dayOutcomes)||dayOutcomes.length>90)
    throw Error('gsc_day_outcomes_invalid');
   hasAtomicDayStore=true;
  }else if(statusResponse.status!==404){
   throw Error('gsc_day_outcomes_read_'+statusResponse.status);
  }
  const report=buildGscStoredOpportunityReport({property,endDate,metrics,
   dayOutcomes,hasAtomicDayStore});
  return NextResponse.json({status:'observations_only',...report,
   checked_at:new Date().toISOString(),metrics_rows:metrics.length,
   observed_day_records:dayOutcomes.length},
   {headers:{'Cache-Control':'no-store'}});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'gsc_report_failed'},
   {status:502,headers:{'Cache-Control':'no-store'}});
 }
}
