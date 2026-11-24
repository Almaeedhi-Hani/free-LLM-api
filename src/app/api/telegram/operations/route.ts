import {NextRequest,NextResponse} from 'next/server';
import {getSupabaseCredentials} from '@/lib/storage-mode';
import {getContent} from '@/lib/content-store';
import {buildPublishedLinks} from '@/lib/published-links';
import {telegramPhase2Enabled,watchdogSnapshot,healthText,claimDelivery,markDelivery} from '@/lib/telegram-ops-notifier';
const core=require('../../../../lib/telegram-ops-core.cjs') as {
 config:(env:NodeJS.ProcessEnv)=>{token:string;secret:string;chat:string;owner:string}|null;
 authentic:(expected:string,supplied:string)=>boolean;
 command:(update:unknown,cfg:{chat:string;owner:string})=>string|null;
 render:(cmd:string,d:Record<string,unknown>)=>string;
 chunks:(text:string)=>string[];
};
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers});
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
async function dataFor(cmd:string){
 const d:Record<string,unknown>={now:new Date().toISOString()};
 const tasks:Promise<void>[]=[];
 const query=(key:string,path:string,one=false)=>tasks.push(readRows(path).then(rows=>{d[key]=one?rows?.[0]??null:rows;}));
 const status=['/status','/brief','/advice'].includes(cmd);
 if(status){
  if(telegramPhase2Enabled())tasks.push(watchdogSnapshot().then(x=>{Object.assign(d,x);}));
  query('radar','analysis_runs?select=status,finished_at&run_type=eq.radar&order=started_at.desc&limit=1',true);
  query('gsc','gsc_sync_day_outcomes?select=status,checked_at&order=checked_at.desc&limit=1',true);
  query('publication','geo_publication_events?select=status,published_at&order=published_at.desc&limit=1',true);
  query('ai','impact_ai_observations?select=verification_status,observed_at&order=observed_at.desc&limit=1',true);
 }
 if(['/market'].includes(cmd)){
  query('competitors','competitors?select=name,domain&status=eq.active&order=last_seen_at.desc&limit=8');
  query('keywords','keywords?select=term&order=last_seen_at.desc&limit=8');
 }
 if(['/brief','/opportunities','/advice'].includes(cmd))query('opportunities','opportunities?select=title&status=in.(new,triaged,planned)&order=score.desc&limit=8');
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
async function send(cfg:NonNullable<ReturnType<typeof core.config>>,message:string){
 for(const part of core.chunks(message)){
  const response=await fetch('https://api.telegram.org/bot'+cfg.token+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cfg.chat,text:part,link_preview_options:{is_disabled:true},...(telegramPhase2Enabled()?{reply_markup:{keyboard:[[{text:'/status'},{text:'/brief'}],[{text:'/market'},{text:'/opportunities'}],[{text:'/published'},{text:'/reviews'}],[{text:'/advice'},{text:'/help'}]],resize_keyboard:true,is_persistent:true}}:{})}),signal:AbortSignal.timeout(7000),redirect:'error',cache:'no-store'
  });
  if(!response.ok)throw Error('delivery_failed');
  const result=await response.json();if(result?.ok!==true||String(result.result?.chat?.id)!==cfg.chat||!Number.isSafeInteger(result.result?.message_id))throw Error('delivery_unconfirmed');
 }
}
async function boundedBody(req:NextRequest):Promise<unknown>{
 if(!req.body)throw Error('missing_body');
 const reader=req.body.getReader();let length=0;const chunks:Uint8Array[]=[];
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>65536){await reader.cancel();throw Error('body_too_large');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }finally{reader.releaseLock();}
}
export async function POST(req:NextRequest){
 const cfg=core.config(process.env);
 if(!cfg)return reply({error:'disabled'},503);
 if(!core.authentic(cfg.secret,req.headers.get('x-telegram-bot-api-secret-token')||''))return reply({error:'unauthorized'},401);
 let update:unknown;try{update=await boundedBody(req);}catch{return reply({error:'invalid_update'},400);}
 const command=core.command(update,cfg);
 if(!command)return reply({ok:true,ignored:true});
 const key=telegramPhase2Enabled()?'command:'+String((update as {update_id:number}).update_id):null;
 try{if(key&&!await claimDelivery(key,'command'))return reply({ok:true,duplicate:true});}catch{return reply({error:'delivery_ledger_unavailable'},503);}
 try{
  const data=await dataFor(command);
  let message=core.render(command,data);
  if(telegramPhase2Enabled()&&['/status','/brief'].includes(command))message=message.replace('Watchdog: غير متحقق من مصدر مستقل في هذه النسخة','')+'\n\n'+healthText(data);
  await send(cfg,message);if(key)await markDelivery(key,'sent');return reply({ok:true});
 }catch{if(key)try{await markDelivery(key,'uncertain');}catch{}return reply({error:'delivery_unconfirmed'},503);}
}
