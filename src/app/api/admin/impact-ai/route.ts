import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {canonicalImpactOrigin} from '@/lib/impact-attribution';
export const dynamic='force-dynamic';
const providers=['ChatGPT','Gemini','Perplexity','Google AI Overview','Other'];
const outcomes=['cited','mentioned','not_observed'];
function authorized(req:NextRequest):boolean{
 const secret=process.env.ADMIN_SECRET||'',received=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(secret),b=Buffer.from(received);
 return !!secret&&a.length===b.length&&timingSafeEqual(a,b);
}
function storage(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('storage_not_configured');
 return {endpoint:url.replace(/\/$/,'')+'/rest/v1/impact_ai_observations',
  headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'}};
}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 const value=req.nextUrl.searchParams.get('days')||'28';
 if(!['7','28','90'].includes(value))return NextResponse.json({error:'unsupported_period'},{status:400});
 try{
  const c=storage();
  const since=new Date(Date.now()-Number(value)*86400000).toISOString();
  const query=new URLSearchParams({select:'id,observed_at,provider,page_path,search_question,result,evidence_url,verification_status',
   observed_at:'gte.'+since,order:'observed_at.desc',limit:'200'});
  const v=await fetch(c.endpoint+'?'+query,{headers:c.headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!v.ok)throw Error('status_'+v.status);
  const observations:unknown=await v.json();
  if(!Array.isArray(observations)||observations.length>=200)throw Error('truncated_samples');
  const outcomes=observations.filter((x:any)=>x.result==='cited'||x.result==='mentioned');
  return NextResponse.json({status:'available',days:Number(value),
   source:'manually_documented_links',sampleCount:observations.length,
   citations:observations.filter((x:any)=>x.result==='cited').length,
   mentions:observations.filter((x:any)=>x.result==='mentioned').length,
   observations,message:'هذه عينات موثقة بروابط أضافها المسؤول؛ لم يتم التحقق المستقل من محتوى الروابط، ولا تمثل رصدًا شاملاً لمنصات AI.'},
   {headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({status:'unavailable',sampleCount:null,observations:[],
   message:'سجل ظهور AI غير متاح حاليًا.'},{status:503});
 }
}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 if(Number(req.headers.get('content-length')||0)>4096)
  return NextResponse.json({error:'request_too_large'},{status:413});
 const data=await req.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  return NextResponse.json({error:'invalid_request'},{status:400});
 const provider=data.provider,pagePath=canonicalImpactOrigin(data.pagePath);
 const query=typeof data.query==='string'?data.query.trim():'';
 const result=data.result,evidence=data.evidenceUrl;
 let validLink=false;
 if(typeof evidence==='string'&&evidence.length<=1500){
  try{
   const url=new URL(evidence),host=url.hostname;
   validLink=url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash&&
    !host.includes(':')&&!/^\d+\.\d+\.\d+\.\d+$/.test(host)&&
    host!=='localhost'&&!host.endsWith('.local')&&
    /^[a-z0-9][-a-z0-9.]*[a-z0-9]$/i.test(host);
  }catch{}
 }
 if(!providers.includes(provider)||!outcomes.includes(result)||!pagePath||
  query.length<5||query.length>240||/[^\s@]+@[^\s@]+\.[^\s@]+/.test(query)||
  !validLink)return NextResponse.json({error:'invalid_evidence'},{status:422});
 try{
  const c=storage();
  const row={provider,page_path:pagePath,search_question:query,result,
   evidence_url:evidence,verification_status:'manual_documented'};
  const saved=await fetch(c.endpoint,{method:'POST',
   headers:{...c.headers,Prefer:'return=representation'},body:JSON.stringify(row),
   cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!saved.ok)throw Error('write_'+saved.status);
  const rows=await saved.json() as Array<{id:string}>;
  if(!Array.isArray(rows)||rows.length!==1||!rows[0].id)throw Error('unconfirmed');
  return NextResponse.json({saved:true,id:rows[0].id,verification:'manual_documented'},
   {headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'observation_not_saved'},{status:503})}
}
