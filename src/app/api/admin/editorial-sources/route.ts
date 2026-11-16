import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
export const dynamic='force-dynamic';
const clean=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function allowed(url:string){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='gov.sa'||u.hostname.endsWith('.gov.sa'))}catch{return false}}
function auth(req:NextRequest){const secret=process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET||'';const provided=req.headers.get('x-admin-secret')||'';const a=Buffer.from(secret),b=Buffer.from(provided);return a.length>0&&a.length===b.length&&timingSafeEqual(a,b)}
export async function POST(req:NextRequest){
 if(!auth(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 const data=await req.json().catch(()=>null);
 if(!data||typeof data.title!=='string'||data.title.length<6||data.title.length>170||!['ar','en','zh'].includes(data.lang))return NextResponse.json({error:'Invalid title or language'},{status:400});
 const q=data.title.replace(/[<>]/g,' ').slice(0,110)+' site:gov.sa';
 try{
  const response=await fetch('https://www.bing.com/search?format=rss&q='+encodeURIComponent(q),{signal:AbortSignal.timeout(7000),cache:'no-store',headers:{Accept:'application/rss+xml'}});
  if(!response.ok)throw Error('Search provider unavailable');
  const xml=(await response.text()).slice(0,250000);
  const found:Array<{url:string;title:string;snippet:string}>=[];
  for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
   const field=(tag:string)=>clean(match[1].match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'))?.[1]||'');
   const url=field('link');if(!allowed(url)||found.some(x=>x.url===url))continue;
   found.push({url,title:field('title').slice(0,180),snippet:field('description').slice(0,260)});
   if(found.length>=5)break;
  }
  return NextResponse.json({results:found,notice:found.length?'روابط مرشحة فقط؛ يجب فتحها والتحقق من صلتها بالمحتوى قبل اعتمادها.':'لم تُعثر على روابط رسمية مناسبة. يمكن إضافة رابط موثق يدويًا.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'تعذر البحث الآن. حاول لاحقًا أو أضف رابطًا حكوميًا يدويًا.'},{status:503})}
}
