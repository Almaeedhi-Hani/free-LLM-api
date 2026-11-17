import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {officialResultsFromRss,officialSourceQueries} from '@/lib/editorial-official-source-search';
export const dynamic='force-dynamic';

function auth(req:NextRequest){
 const secret=process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET||'';
 const provided=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(secret),b=Buffer.from(provided);
 return a.length>0&&a.length===b.length&&timingSafeEqual(a,b);
}
export async function POST(req:NextRequest){
 if(!auth(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 const data=await req.json().catch(()=>null);
 if(!data||typeof data.title!=='string'||data.title.length<6||data.title.length>170||
   !['ar','en','zh'].includes(data.lang)||
   (data.primary_keyword!==undefined&&(typeof data.primary_keyword!=='string'||data.primary_keyword.length>160))||
   (data.target!==undefined&&(typeof data.target!=='string'||data.target.length>120)))
   return NextResponse.json({error:'Invalid title, language or search context'},{status:400});
 const queries=officialSourceQueries({
  title:data.title,lang:data.lang,primary_keyword:data.primary_keyword,target:data.target,
 });
 let attempted=0,providerErrors=0;
 try{
  // Queries are explicitly triggered by the human reviewer, never by a cron.
  // Try a second topic-aware query only if the first yielded no candidates.
  for(const query of queries){
   attempted++;
   try{
    const response=await fetch('https://www.bing.com/search?format=rss&q='+encodeURIComponent(query),{
     signal:AbortSignal.timeout(7000),cache:'no-store',headers:{Accept:'application/rss+xml'},
    });
    if(!response.ok)throw Error('Provider unavailable');
    const results=officialResultsFromRss(await response.text(),5);
    if(results.length)return NextResponse.json({
     results,attempted,
     notice:'روابط حكومية مرشحة للبحث فقط. افتح المصدر وتحقق أنه يدعم النص المقترح قبل إضافته؛ ولا تعني النتائج اعتماد المحتوى.',
    },{headers:{'Cache-Control':'no-store'}});
   }catch{providerErrors++;}
  }
  if(attempted>0&&providerErrors===attempted)
   return NextResponse.json({error:'تعذر البحث الآن. حاول لاحقًا أو أضف رابطًا حكوميًا يدويًا.'},{status:503});
  return NextResponse.json({results:[],attempted,notice:'لم يعثر البحث على مصدر حكومي مناسب. يمكن إضافة رابط رسمي تمت مراجعته يدويًا.'},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'تعذر البحث الآن. حاول لاحقًا أو أضف رابطًا حكوميًا يدويًا.'},{status:503});
 }
}
