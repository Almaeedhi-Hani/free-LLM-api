import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {getContent} from '@/lib/content-store';
import {getSupabaseCredentials} from '@/lib/storage-mode';
import {listCompetitors,listKeywords,listOpportunities,listGoals,listRuns} from '@/lib/market-intelligence';
import {buildPublishedLinks} from '@/lib/published-links';



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
  const links=buildPublishedLinks(content.editorialItems,content.faqs);
  const keywordById=new Map(keywords.map(k=>[k.id,k.term]));
  const competitorById=new Map(competitors.map(k=>[k.id,k.name||k.domain]));
  const opportunityById=new Map(opportunities.map(k=>[k.id,k.title]));
  const isId=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const resolve=(values:string[]|null|undefined,index:Map<string,string>)=>{
   const items=Array.isArray(values)?values.filter(v=>typeof v==='string'&&v.trim()):[];
   const names=Array.from(new Set(items.map(v=>index.get(v)||(!isId(v)?v:'')).filter(Boolean)));
   if(items.some(v=>isId(v)&&!index.has(v)))names.push('تعذر العثور على بعض السجلات المرتبطة');
   return names;
  };
  const describe=(g:typeof goals[number])=>{
   const desc=g.description?.trim();
   if(desc&&!/^OpenCode candidate\s*;/i.test(desc))return desc;
   const related=g.related_opportunity_id?opportunityById.get(g.related_opportunity_id):undefined;
   return related&&related!==g.title?'المطلوب: '+g.title+' — الفرصة المرتبطة: '+related:'المطلوب: '+g.title+' (لا يتوفر وصف تفصيلي محفوظ)';
  };
  const outcomeKeys=['competitors_analyzed','keywords_analyzed','opportunities_created','goals_created','suggestions_collected','keywords_upserted','competitors_discovered','observations_recorded','unique_domains'];
  const summarize=(summary:Record<string,unknown>|null|undefined)=>{
   const result:Record<string,number|string[]>={};
   if(!summary)return result;
   for(const source of [summary,summary.discovery,summary.analysis]){
    if(!source||typeof source!=='object')continue;
    const data=source as Record<string,unknown>;
    for(const key of outcomeKeys){const v=data[key];if(typeof v==='number'&&Number.isFinite(v))result[key]=v;}
    for(const key of ['competitor_names_analyzed','keyword_terms_analyzed','opportunity_titles_created','goal_titles_created','keyword_terms_saved','competitor_domains_discovered']){
     const v=data[key];if(Array.isArray(v))result[key]=Array.from(new Set(v.filter((x):x is string=>typeof x==='string'&&!!x.trim()&&!isId(x))));
    }
   }
   return result;
  };
  return NextResponse.json({generatedAt:new Date().toISOString(),
   competitors:competitors.map(({name,domain})=>({name,domain})),
   keywords:keywords.map(({term,language,search_volume})=>({term,language,search_volume})),
   opportunities:opportunities.map(({title,type,priority,related_keywords,related_competitors})=>({title,type,priority,related_keywords:resolve(related_keywords,keywordById),related_competitors:resolve(related_competitors,competitorById)})),
   goals:goals.map(g=>({title:g.title,description:describe(g),status:g.status})),
   runs:runs.map(({run_type,started_at,status,summary})=>({run_type,started_at,status,summary:summarize(summary)})),
   drafts:content.drafts.filter(d=>d.status==='pending').map(d=>({q:d.q,status:d.status})),
   editorialDrafts:content.editorialItems.filter(d=>d.status==='pending').map(d=>({title:d.title,status:d.status})),
   faqs:content.faqs.map(({q,a})=>({q,a})),
   siteKeywords:content.keywords,
   links:links.map(({title,language,path})=>({title,language,path}))},{headers});
 }catch{return NextResponse.json({error:'تعذر قراءة بيانات التقرير كاملة؛ لم يتم إنشاء تقرير ناقص.'},{status:503,headers});}
}
