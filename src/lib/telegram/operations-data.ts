import {getSupabaseCredentials} from '@/lib/storage-mode';
import {getContent} from '@/lib/content-store';
import {buildPublishedLinks} from '@/lib/published-links';
import {telegramPhase2Enabled,watchdogSnapshot} from '@/lib/telegram-ops-notifier';
import {advancedEnabled} from '@/lib/telegram-ops-advanced';

const site='https://free-llm-api-1-didl.onrender.com';
type Row=Record<string,unknown>;
async function readRows(path:string):Promise<Row[]|null>{
 try{
  const cfg=getSupabaseCredentials();if(!cfg)return null;
  const r=await fetch(cfg.url+'/rest/v1/'+path,{headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},cache:'no-store',signal:AbortSignal.timeout(6000),redirect:'error'});
  if(!r.ok)return null;
  const data=await r.json();return Array.isArray(data)?data:null;
 }catch{return null;}
}
export async function dataFor(cmd:string){
 const d:Record<string,unknown>={now:new Date().toISOString(),advanced:advancedEnabled()};
 const tasks:Promise<void>[]=[];
 const query=(key:string,path:string,one=false)=>tasks.push(readRows(path).then(rows=>{d[key]=one?rows?.[0]??null:rows;}));
 const status=['/status','/brief','/advice','/commandcenter'].includes(cmd);
 if(status){
  if(telegramPhase2Enabled()||cmd==='/commandcenter')tasks.push(watchdogSnapshot().then(x=>{Object.assign(d,x);}));
  query('radar','analysis_runs?select=status,finished_at&run_type=eq.radar&order=started_at.desc&limit=1',true);
  query('gsc','gsc_sync_day_outcomes?select=status,checked_at,metric_date,rows_fetched&order=metric_date.desc,checked_at.desc&limit=1&property=eq.'+encodeURIComponent(process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/')+'',true);
  query('publication','geo_publication_events?select=status,published_at&order=published_at.desc&limit=1',true);
  query('ai','impact_ai_observations?select=verification_status,observed_at&order=observed_at.desc&limit=1',true);
 }
 if(['/market'].includes(cmd)){
  query('competitors','competitors?select=name,domain&status=eq.active&order=last_seen_at.desc&limit=8');
  query('keywords','keywords?select=term&order=last_seen_at.desc&limit=8');
 }
 if(['/brief','/opportunities','/advice','/commandcenter'].includes(cmd))query('opportunities','opportunities?select=title,score,priority&status=in.(new,triaged,planned)&order=score.desc&limit=8');
 if(cmd==='/opportunities')query('goals','agent_goals?select=title&status=eq.open&order=created_at.desc&limit=8');
 if(cmd==='/brief')query('weekly','weekly_reports?select=week_key,verified_at&order=week_key.desc&limit=1',true);
 if(status||['/published','/reviews'].includes(cmd))tasks.push((async()=>{
  try{
   // Production storage is fail-closed. No contact or customer details leave the system.
   if(!getSupabaseCredentials())throw Error('storage unavailable');
   const content=await getContent();
   const drafts=[...content.drafts.filter(x=>x.status==='pending').map(x=>({title:x.q})),...content.editorialItems.filter(x=>x.status==='pending').map(x=>({title:x.title}))];
   const links=buildPublishedLinks(content.editorialItems,content.faqs);
   d.geo=content.agent;d.pending=drafts.length;d.publishedCount=links.length;
   d.drafts=drafts.slice(0,8);d.links=links.slice(0,8).map(x=>({title:x.title,url:site+x.path}));
  }catch{d.geo=null;d.pending=null;d.publishedCount=null;d.drafts=null;d.links=null;}
 })());
 await Promise.all(tasks);return d;
}
