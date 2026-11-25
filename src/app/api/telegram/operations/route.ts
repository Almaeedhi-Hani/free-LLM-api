import {NextRequest,NextResponse} from 'next/server';
import {getSupabaseCredentials} from '@/lib/storage-mode';
import {getContent} from '@/lib/content-store';
import {buildPublishedLinks} from '@/lib/published-links';
import {telegramPhase2Enabled,watchdogSnapshot,healthText,claimDelivery,markDelivery} from '@/lib/telegram-ops-notifier';
import {advancedEnabled,parseAdvanced,handleAdvanced,handleVoice,memorySummary,reviewMenu} from '@/lib/telegram-ops-advanced';
const coordinator=require('../../../../lib/telegram-ops-coordinator.cjs') as {report:(d:Record<string,unknown>)=>Promise<string>};
const coordinatorEnabled=()=>process.env.TELEGRAM_OPS_COORDINATOR_ENABLED==='true';
const core=require('../../../../lib/telegram-ops-core.cjs') as {
 config:(env:NodeJS.ProcessEnv)=>{token:string;secret:string;chat:string;owner:string}|null;
 authentic:(expected:string,supplied:string)=>boolean;
 command:(update:unknown,cfg:{chat:string;owner:string})=>string|null;
 render:(cmd:string,d:Record<string,unknown>)=>string;
 chunks:(text:string)=>string[];
 normalizeCommand:(text:unknown)=>string;
 reviewCallback:(update:unknown,cfg:{owner:string;chat:string})=>{id:string;update:unknown}|null;
 keyboard:(advanced:boolean,coordinator:boolean)=>{keyboard:{text:string}[][];resize_keyboard:boolean;is_persistent:boolean};
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
async function send(cfg:NonNullable<ReturnType<typeof core.config>>,message:string,inline?:{text:string;callback_data:string}[][]){
 const parts=core.chunks(message);
 for(let index=0;index<parts.length;index++){
  const part=parts[index];
  const response=await fetch('https://api.telegram.org/bot'+cfg.token+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cfg.chat,text:part,link_preview_options:{is_disabled:true},...(inline&&inline.length&&index===parts.length-1?{reply_markup:{inline_keyboard:inline}}:telegramPhase2Enabled()?{reply_markup:core.keyboard(advancedEnabled(),coordinatorEnabled())}:{})}),signal:AbortSignal.timeout(7000),redirect:'error',cache:'no-store'
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
 const callback=advancedEnabled()?core.reviewCallback(update,cfg):null;
 if(callback){
  update=callback.update;
  try{await fetch('https://api.telegram.org/bot'+cfg.token+'/answerCallbackQuery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({callback_query_id:callback.id}),redirect:'error',signal:AbortSignal.timeout(3000),cache:'no-store'});}catch{}
 }
 const command=core.command(update,cfg);
 if(!command)return reply({ok:true,ignored:true});
 const key=(telegramPhase2Enabled()||advancedEnabled()||coordinatorEnabled())?'command:'+String((update as {update_id:number}).update_id):null;
 try{if(key&&!await claimDelivery(key,'command'))return reply({ok:true,duplicate:true});}catch{return reply({error:'delivery_ledger_unavailable'},503);}
 try{
  const action=command==='unknown'?parseAdvanced(core.normalizeCommand((update as {message?:{text?:unknown}}).message?.text)):null;
  let message:string;let inline:{text:string;callback_data:string}[][]|undefined;
  if(command==='unknown'&&core.normalizeCommand((update as {message?:{text?:unknown}}).message?.text)==='/commandcenter'){
   message=coordinatorEnabled()?await coordinator.report(await dataFor('/commandcenter')):'غرفة القيادة غير مفعلة بعد.';
   if(coordinatorEnabled()&&advancedEnabled())try{message+='\n\n'+await memorySummary(cfg);}catch{message+='\n\nالذاكرة الاستراتيجية غير متاحة.';}
  }
  else if(action?.kind==='reviewlist'){const m=await reviewMenu();message=m.text;inline=m.inline_keyboard;}
  else if(action)message=await handleAdvanced(action,cfg,(update as {update_id:number}).update_id);
  else if(command==='voice'&&advancedEnabled())message=await handleVoice(update,cfg);
  else{
   const data=await dataFor(command);
   if(telegramPhase2Enabled()&&['/status','/brief'].includes(command))data.healthSummary=healthText(data);
   message=core.render(command,data);
   if(coordinatorEnabled()&&['/help','/start','unknown'].includes(command))message+='\n\n/commandcenter — غرفة القيادة';
   if(advancedEnabled()){
    if(command==='/advice')message+='\n\n'+await memorySummary(cfg);
    if(['/help','/start','unknown'].includes(command))message+='\n\n/memory — قراراتك المحفوظة\n/remember نص القرار — حفظ صريح\n/reviewlist — مراجعة المحتوى\nالصوت: تفريغ واقتراح أمر قراءة بعد تفعيله؛ لا تنفيذ تلقائي.';
   }
  }
  await send(cfg,message,inline);if(key)await markDelivery(key,'sent');return reply({ok:true});
 }catch{if(key)try{await markDelivery(key,'uncertain');}catch{}return reply({error:'delivery_unconfirmed'},503);}
}
