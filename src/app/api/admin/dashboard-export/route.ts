import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {getContent} from '@/lib/content-store';
import {getSupabaseCredentials} from '@/lib/storage-mode';
import {listCompetitors,listKeywords,listOpportunities,listGoals,listRuns} from '@/lib/market-intelligence';
import {buildPublishedLinks} from '@/lib/published-links';
import type {PublicationEventSummary} from '@/lib/published-links';
import {getAutoPublicationStatus} from '@/lib/geo-auto-publication';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};
function allowed(req:NextRequest){
 const a=Buffer.from(process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET||'');
 const b=Buffer.from(req.headers.get('x-admin-secret')||'');
 return a.length>0&&a.length===b.length&&timingSafeEqual(a,b);
}
async function allRows<T>(table:string,local:()=>Promise<T[]>):Promise<T[]>{
 const cfg=getSupabaseCredentials();
 if(!cfg)return local();
 const rows:T[]=[];
 let offset=0;
 for(;;){
  const r=await fetch(cfg.url+'/rest/v1/'+table+'?select=*&order=id.asc&offset='+offset+'&limit=500',
   {headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},cache:'no-store'});
  if(!r.ok)throw Error('export source unavailable');
  const page=await r.json();
  if(!Array.isArray(page))throw Error('invalid export source');
  if(!page.length)return rows;
  rows.push(...page);
  offset+=page.length;
 }
}
export async function GET(req:NextRequest){
 if(!allowed(req))return NextResponse.json({error:'unauthorized'},{status:401,headers});
 try{
  const [content,competitors,keywords,opportunities,goals,runs]=await Promise.all([
   getContent(),allRows('competitors',()=>listCompetitors()),allRows('keywords',()=>listKeywords()),
   allRows('opportunities',()=>listOpportunities()),allRows('agent_goals',()=>listGoals()),
   allRows('analysis_runs',()=>listRuns(Number.MAX_SAFE_INTEGER))
  ]);
  const publication=await getAutoPublicationStatus().catch(()=>null);
  const events=publication?.available&&Array.isArray(publication.events)?publication.events as PublicationEventSummary[]:[];
  const links=buildPublishedLinks(content.editorialItems,content.faqs,events);
  return NextResponse.json({generatedAt:new Date().toISOString(),updatedAt:content.updatedAt,competitors,keywords,
   opportunities,goals,runs:runs.map(({summary,error,...r})=>({...r,summary:summary?Object.fromEntries(Object.entries(summary).filter(([k,v])=>/count|total|created|saved|processed|status/i.test(k)&&typeof v==='number')):null,error:error?'راجع سجل التشغيل الأصلي':null})),
   drafts:content.drafts.filter(d=>d.status==='pending'),editorialDrafts:content.editorialItems.filter(d=>d.status==='pending'),
   faqs:content.faqs,siteKeywords:content.keywords,links,publicationEvidenceAvailable:!!publication?.available},{headers});
 }catch{return NextResponse.json({error:'تعذر قراءة بيانات التقرير كاملة؛ لم يتم إنشاء تقرير ناقص.'},{status:503,headers});}
}
