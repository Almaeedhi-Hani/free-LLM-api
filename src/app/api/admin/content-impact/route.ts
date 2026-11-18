import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {summarizePageImpact} from '@/lib/content-impact-metrics';
import type {GscPageRecord} from '@/lib/content-impact-metrics';
export const dynamic='force-dynamic';
function authorized(req:NextRequest):boolean {
 const expected=process.env.ADMIN_SECRET||'';
 const provided=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(expected),b=Buffer.from(provided);
 return !!expected&&a.length===b.length&&timingSafeEqual(a,b);
}
/** Read-only page-level statistics. Never return misleading site totals as
 * page metrics; no request parameters are used as Supabase table names. */
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 const value=req.nextUrl.searchParams.get('days')||'28';
 if(!['7','28','90'].includes(value))return NextResponse.json({error:'unsupported_period'},{status:400});
 const days=Number(value) as 7|28|90;
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({status:'unavailable',message:'لم يُهيأ مخزن قياسات GSC في الخادم.',pages:{}},{status:503});
 const property=process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/';
 const end=new Date();end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()-3);
 const start=new Date(end);start.setUTCDate(start.getUTCDate()-(days-1));
 const startDate=start.toISOString().slice(0,10),endDate=end.toISOString().slice(0,10);
 const query=new URLSearchParams({
  select:'property,metric_date,dimension,dimension_value,clicks,impressions,position,captured_at',
  property:'eq.'+property,
  dimension:'eq.page',metric_date:'gte.'+startDate,
  order:'metric_date.desc',limit:'5000'
 });
 query.append('metric_date','lte.'+endDate);
 try{
  const res=await fetch(url.replace(/\/$/,'')+'/rest/v1/gsc_daily_metrics?'+query.toString(),{
   headers:{apikey:key,authorization:'Bearer '+key},cache:'no-store',
   signal:AbortSignal.timeout(12000)
  });
  if(!res.ok)throw Error('gsc_storage_'+res.status);
  const rows=await res.json() as GscPageRecord[];
  if(!Array.isArray(rows))throw Error('invalid_gsc_response');
  // Never present a possibly truncated result as complete measurement.
  if(rows.length>=5000)return NextResponse.json({status:'unavailable',pages:{},
   message:'تجاوزت قياسات الصفحات حد القراءة الآمنة. يلزم تقسيم الطلب إلى دفعات.'},{status:503});
  const measured=summarizePageImpact(rows,days,property);
  return NextResponse.json({...measured,startDate,endDate},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  console.error('content impact read error',error instanceof Error?error.message:'unavailable');
  return NextResponse.json({status:'unavailable',pages:{},
   message:'تعذّر قراءة قياسات الصفحات من GSC. لا يمكن افتراض أنها صفر.'},{status:503});
 }
}
