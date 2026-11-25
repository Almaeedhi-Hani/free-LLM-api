import {createHash} from 'node:crypto';
import {getContent} from './content-store';
import {getCompetitorDomains} from './source-policy-store';
import {renderKnowledge,type KnowledgeSelection} from './llm-knowledge';
import {recordFeed} from './llm-knowledge-metrics';
const SITE=(process.env.SITE_URL||'https://free-llm-api-1-didl.onrender.com').replace(/\/$/,'');
export async function serveKnowledge(req:Request,sel:KnowledgeSelection,path:string){
 const started=Date.now();
 const finish=(status:number,body:string|null,headers:Record<string,string>={})=>{
  const bytes=body===null?0:Buffer.byteLength(body);recordFeed(path,req.headers.get('user-agent')||'',status,bytes,Date.now()-started);
  return new Response(body,{status,headers:{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff',...headers}});
 };
 try{
  const [content,domains]=await Promise.all([getContent(),getCompetitorDomains().catch(()=>null)]);
  const text=renderKnowledge(content,sel,SITE,domains);
  if(text===null)return finish(404,'Not found\n',{'Cache-Control':'no-store'});
  const etag='W/"'+createHash('sha256').update(text).digest('hex')+'"';
  const headers={'ETag':etag,'Cache-Control':'public, max-age=0, must-revalidate','Link':'<'+SITE+'/llms.txt>; rel="describedby"; type="text/plain", <'+SITE+'/llms-full.txt>; rel="alternate"; type="text/plain"'};
  // Body-based ETag is authoritative, including deletions and code changes.
  const matches=(req.headers.get('if-none-match')||'').split(',').map(v=>v.trim().replace(/^W\//,''));
  if(matches.includes('*')||matches.includes(etag.slice(2)))return finish(304,null,headers);
  if(sel.kind==='page')headers['Link']+='';
  return finish(200,req.method==='HEAD'?null:text,headers);
 }catch{return finish(503,'Knowledge temporarily unavailable\n',{'Cache-Control':'no-store','Retry-After':'60'})}
}
