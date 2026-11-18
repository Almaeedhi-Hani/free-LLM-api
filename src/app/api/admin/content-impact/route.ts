import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {summarizePageImpact} from '@/lib/content-impact-metrics';
import type {GscPageRecord} from '@/lib/content-impact-metrics';
import {summarizeConfirmedLeads} from '@/lib/impact-attribution';
import type {ConfirmedLeadEvent,LeadTotals} from '@/lib/impact-attribution';

export const dynamic='force-dynamic';
function authorized(req:NextRequest):boolean{
 const expected=process.env.ADMIN_SECRET||'';
 const provided=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(expected),b=Buffer.from(provided);
 return !!expected&&a.length===b.length&&timingSafeEqual(a,b);
}
/** Source-separated read-only analytics: no requests, visitor identities or
 * prices leave the server. Missing GSC coverage must never become 0. */
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 const requested=req.nextUrl.searchParams.get('days')||'28';
 if(!['7','28','90'].includes(requested))return NextResponse.json({error:'unsupported_period'},{status:400});
 const days=Number(requested) as 7|28|90;
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({status:'unavailable',leads:{status:'unavailable'},pages:{},
  message:'لا توجد إعدادات لمخزن القياسات.'},{status:503});
 const property=process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/';
 const end=new Date();end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()-3);
 const start=new Date(end);start.setUTCDate(start.getUTCDate()-(days-1));
 const startDate=start.toISOString().slice(0,10),endDate=end.toISOString().slice(0,10);
 const since=new Date(Date.now()-days*86400000).toISOString();
 const base=url.replace(/\/$/,'')+'/rest/v1/';
 const gsc=new URLSearchParams({
  select:'property,metric_date,dimension,dimension_value,clicks,impressions,position,captured_at',
  property:'eq.'+property,dimension:'eq.page',metric_date:'gte.'+startDate,
  order:'metric_date.desc',limit:'5000'
 });
 gsc.append('metric_date','lte.'+endDate);
 const leads=new URLSearchParams({
  select:'source_path,attribution,occurred_at,locale',
  occurred_at:'gte.'+since,order:'occurred_at.desc',limit:'5000'
 });
 const load=async(path:string)=>{
  const resp=await fetch(base+path,{headers:{apikey:key,authorization:'Bearer '+key},
   signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!resp.ok)throw Error('metric_storage_'+resp.status);
  const rows:unknown=await resp.json();
  if(!Array.isArray(rows)||rows.length>=5000)throw Error('invalid_or_truncated_metric_rows');
  return rows;
 };
 const [pageResult,leadResult]=await Promise.allSettled([
  load('gsc_daily_metrics?'+gsc),load('impact_lead_events?'+leads)
 ]);
 const page=pageResult.status==='fulfilled'?
  summarizePageImpact(pageResult.value as GscPageRecord[],days,property):
  {source:'gsc_daily_page' as const,days,status:'unavailable' as const,pages:{},
   message:'تعذر قراءة بيانات الصفحات من Google Search Console. الظهور والنقرات غير متاحين.'};
 let leadSummary:LeadTotals|null=null;
 if(leadResult.status==='fulfilled'){
  try{leadSummary=summarizeConfirmedLeads(leadResult.value as ConfirmedLeadEvent[])}catch{}
 }
 const conversions=leadSummary||{status:'unavailable' as const,total:null,byPage:{},
  message:'تعذّر قراءة طلبات الباقات المؤكدة؛ عدد التحويلات غير متاح.'};
 const unavailable=page.status==='unavailable'&&conversions.status==='unavailable';
 return NextResponse.json({...page,startDate,endDate,
  leads:conversions,leadPeriod:{from:since,to:new Date().toISOString()},
  attributionNote:'الإسناد إلى صفحة سابقة معلومة قدمها المتصفح؛ لا يثبت السببية أو جودة العميل.',
  aiVisibilityStatus:'not_connected'},
  {status:unavailable?503:200,headers:{'Cache-Control':'no-store'}});
}
