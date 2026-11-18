import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {compareRevisionImpact,rankObservedRevisions} from '@/lib/geo-impact-experiments';
import type {PublicationRevision,ImpactDays} from '@/lib/geo-impact-experiments';
import type {GscPageRecord} from '@/lib/content-impact-metrics';

export const dynamic='force-dynamic';
function authorized(req:NextRequest):boolean{
 const expected=process.env.ADMIN_SECRET||'',provided=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(expected),b=Buffer.from(provided);
 return !!expected&&a.length===b.length&&timingSafeEqual(a,b);
}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 const raw=req.nextUrl.searchParams.get('days')||'28';
 if(!['7','28','90'].includes(raw))return NextResponse.json({error:'unsupported_period'},{status:400});
 const days=Number(raw) as ImpactDays;
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({status:'unavailable',message:'مخزن البيانات غير مجهز.'},{status:503});
 const property=process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/';
 const base=url.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:key,authorization:'Bearer '+key};
 async function read(path:string):Promise<unknown[]>{
  const v=await fetch(base+path,{headers,cache:'no-store',signal:AbortSignal.timeout(14000)});
  if(!v.ok)throw Error('storage_'+v.status);
  const data:unknown=await v.json();
  if(!Array.isArray(data)||data.length>=5000)throw Error('truncated_or_invalid_analytics');
  return data;
 }
 try{
  const published=await read('geo_publication_events?select=id,item_id,target_path,language,status,published_at&order=published_at.desc&limit=200') as PublicationRevision[];
  if(!published.length)return NextResponse.json({status:'no_publications',days,revisions:[],source:'geo_publication_events',
   message:'لا توجد إصدارات منشورة مسجلة يمكن مقارنتها.'},{headers:{'Cache-Control':'no-store'}});
  const valid=published.filter(e=>Number.isFinite(Date.parse(e.published_at)));
  const oldest=Math.min(...valid.map(e=>Date.parse(e.published_at)))-days*86400000;
  const startDate=new Date(oldest).toISOString().slice(0,10);
  const end=new Date();end.setUTCDate(end.getUTCDate()-3);
  const endDate=end.toISOString().slice(0,10);
  const search=new URLSearchParams({
   select:'property,metric_date,dimension,dimension_value,clicks,impressions,position,captured_at',
   property:'eq.'+property,dimension:'eq.page',metric_date:'gte.'+startDate,
   order:'metric_date.desc',limit:'5000'
  });
  search.append('metric_date','lte.'+endDate);
  let metrics:GscPageRecord[];
  try{metrics=await read('gsc_daily_metrics?'+search) as GscPageRecord[]}
  catch{return NextResponse.json({status:'gsc_unavailable',days,revisions:[],source:'geo_publication_events',
   publishedCount:published.length,message:'تعذر جلب قياسات GSC الكاملة؛ لا يمكن ترتيب الفرص ببيانات ناقصة.'},
   {status:503,headers:{'Cache-Control':'no-store'}});}
  const ranked=rankObservedRevisions(published.map(event=>
   compareRevisionImpact(event,metrics,days,property)));
  return NextResponse.json({status:ranked.some(x=>x.status==='measured')?'partial_or_measured':'insufficient_data',
   days,source:'geo_publication_events_and_gsc',property,publications:published.length,
   measured:ranked.filter(x=>x.status==='measured').length,
   revisions:ranked,message:'الترتيب يعتمد على التغير المرصود في النقرات للنسخ ذات فترتين مكتملتين فقط؛ لا يثبت السببية ولا يقيس ظهور AI تلقائيًا.'},
   {headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('impact experiment read',e instanceof Error?e.message:'unknown');
  return NextResponse.json({status:'unavailable',days,revisions:[],message:'تعذر قراءة سجل الإصدارات.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
