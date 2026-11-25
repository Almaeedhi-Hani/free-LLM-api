import {getSupabaseCredentials} from '@/lib/storage-mode';
import {getContent} from '@/lib/content-store';
import {reviewNotificationCandidates,type ReviewButton} from '@/lib/telegram-ops-advanced';
import {buildPublishedLinks} from '@/lib/published-links';
const core=require('./telegram-ops-core.cjs') as {config:(env:NodeJS.ProcessEnv)=>{token:string;secret:string;chat:string;owner:string}|null;render:(cmd:string,d:Record<string,unknown>)=>string;chunks:(text:string)=>string[];reconcileReviewWebhook:(cfg:{token:string;secret:string;chat:string;owner:string},username:string,api:(method:string,body:object)=>Promise<unknown>)=>Promise<string>};
const phase=require('./telegram-ops-phase2.cjs') as {dailyKey:(now:string)=>string|null;alerts:(d:Record<string,unknown>)=>{key:string;text:string}[];healthText:(d:Record<string,unknown>)=>string};
type Row=Record<string,unknown>;
const repo='https://api.github.com/repos/Almaeedhi-Hani/free-LLM-api';
export function telegramPhase2Enabled(){return process.env.TELEGRAM_OPS_PHASE2_ENABLED==='true';}
async function github(path:string){
 const token=process.env.V3_GITHUB_DISPATCH_TOKEN||process.env.AUTODEV_GITHUB_TOKEN||process.env.GITHUB_DISPATCH_TOKEN;
 if(!token)return null;
 try{const r=await fetch(repo+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(4500),redirect:'error',cache:'no-store'});return r.ok?await r.json():null;}catch{return null;}
}
export async function watchdogSnapshot(){
 const [runs,issues]=await Promise.all([github('/actions/workflows/v3-phase2-safety-monitor.yml/runs?event=workflow_dispatch&status=completed&branch=main&per_page=1'),github('/issues?state=open&labels=watchdog&per_page=100')]);
 const run=runs?.workflow_runs?.[0];
 return {watchdog:run?{status:run.conclusion,finished_at:run.updated_at}:null,watchdogIssues:Array.isArray(issues)?issues.filter(x=>!x.pull_request).map(x=>({number:x.number,created_at:x.created_at})):null};
}
export function healthText(d:Record<string,unknown>){return phase.healthText(d);}
async function rows(path:string):Promise<Row[]|null>{
 try{const cfg=getSupabaseCredentials();if(!cfg)return null;
 const r=await fetch(cfg.url+'/rest/v1/'+path,{headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},signal:AbortSignal.timeout(4500),redirect:'error',cache:'no-store'});if(!r.ok)return null;const j=await r.json();return Array.isArray(j)?j:null;}catch{return null;}
}
async function snapshot(now:string){
 const d:Record<string,unknown>={now};
 await Promise.all([
  rows('analysis_runs?select=status,finished_at&run_type=eq.radar&order=started_at.desc&limit=1').then(x=>{d.radar=x?.[0]??null;}),
  rows('gsc_sync_day_outcomes?select=status,checked_at,metric_date,rows_fetched&order=metric_date.desc,checked_at.desc&limit=1&property=eq.'+encodeURIComponent(process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/')+'').then(x=>{d.gsc=x?.[0]??null;}),
  rows('geo_publication_events?select=status,published_at&order=published_at.desc&limit=1').then(x=>{d.publication=x?.[0]??null;}),
  rows('impact_ai_observations?select=verification_status,observed_at&order=observed_at.desc&limit=1').then(x=>{d.ai=x?.[0]??null;}),
  rows('weekly_reports?select=week_key,verified_at&order=week_key.desc&limit=1').then(x=>{d.weekly=x?.[0]??null;}),
  rows('opportunities?select=title&status=in.(new,triaged,planned)&order=score.desc&limit=8').then(x=>{d.opportunities=x;}),
  watchdogSnapshot().then(x=>Object.assign(d,x)),
  (async()=>{try{if(!getSupabaseCredentials())throw Error('unavailable');const c=await getContent();d.geo=c.agent;d.pending=c.drafts.filter(x=>x.status==='pending').length+c.editorialItems.filter(x=>x.status==='pending').length;d.publishedCount=buildPublishedLinks(c.editorialItems,c.faqs).length;}catch{d.geo=null;d.pending=null;d.publishedCount=null;}})()
 ]);
 return d;
}
async function ledger(path:string,method:string,body?:object,prefer?:string){
 const cfg=getSupabaseCredentials();if(!cfg)throw Error('telegram_ledger_unavailable');
 const r=await fetch(cfg.url+'/rest/v1/telegram_ops_deliveries'+path,{method,headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(4000),redirect:'error',cache:'no-store'});
 if(!r.ok)throw Error('telegram_ledger_http_'+r.status);
 return r.status===204?null:await r.json();
}
export async function claimDelivery(key:string,kind:'daily'|'alert'|'command'){
 const result=await ledger('?on_conflict=delivery_key','POST',{delivery_key:key,kind},'resolution=ignore-duplicates,return=representation');
 if(!Array.isArray(result))throw Error('telegram_claim_unverified');
 return result.length===1&&result[0].delivery_key===key;
}
export async function markDelivery(key:string,state:'sent'|'uncertain',id?:number){
 const result=await ledger('?delivery_key=eq.'+encodeURIComponent(key),'PATCH',{state,...(state==='sent'?{sent_at:new Date().toISOString(),...(id?{telegram_message_id:id}:{})}:{})},'return=representation');
 if(!Array.isArray(result)||result.length!==1||result[0].state!==state)throw Error('telegram_delivery_readback_unverified');
}
async function sendOne(cfg:NonNullable<ReturnType<typeof core.config>>,message:string,inline?:ReviewButton[][]){
 const r=await fetch('https://api.telegram.org/bot'+cfg.token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cfg.chat,text:message.slice(0,3800),link_preview_options:{is_disabled:true},...(inline?.length?{reply_markup:{inline_keyboard:inline}}:{})}),signal:AbortSignal.timeout(5000),redirect:'error',cache:'no-store'});
 const j=await r.json();if(!r.ok||j?.ok!==true||String(j.result?.chat?.id)!==cfg.chat||!Number.isSafeInteger(j.result?.message_id))throw Error('telegram_delivery_unconfirmed');return Number(j.result.message_id);
}
async function reconcileReviewSubscription(cfg:NonNullable<ReturnType<typeof core.config>>,now:string){
 if(process.env.TELEGRAM_OPS_ADVANCED_ENABLED!=='true')return 'disabled';
 const key='webhook-check:'+now.slice(0,10);
 try{
  if(!await claimDelivery(key,'command'))return 'already_checked';
  const status=await core.reconcileReviewWebhook(cfg,process.env.TELEGRAM_BOT_USERNAME||'',async(method,body)=>{
   const r=await fetch('https://api.telegram.org/bot'+cfg.token+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(4500),redirect:'error',cache:'no-store'});
   const j=await r.json();if(!r.ok||j?.ok!==true)throw Error('telegram_request_failed');return j.result;
  });
  await markDelivery(key,status==='verified'||status==='repaired_verified'?'sent':'uncertain');
  return status;
 }catch{return 'subscription_unverified';}
}
export async function runTelegramTick(now:string){
 if(!telegramPhase2Enabled())return {status:'disabled'};
 const cfg=core.config(process.env);if(!cfg)return {status:'configuration_incomplete'};
 const subscription=reconcileReviewSubscription(cfg,now);
 const d=await snapshot(now);
 const day=phase.dailyKey(now);
 const candidates:{key:string;kind:'daily'|'alert';text:string;inline_keyboard?:ReviewButton[][]}[]=[...(day?[{key:day,kind:'daily' as const,text:'الإحاطة اليومية\n'+core.render('/brief',{...d,healthSummary:phase.healthText(d)})}]:[]),...phase.alerts(d).map(x=>({...x,kind:'alert' as const}))];
 // Reuse the existing signed tick and delivery ledger, no new schedule.
 if(process.env.TELEGRAM_OPS_ADVANCED_ENABLED==='true'){
  try{
   const reviews=await reviewNotificationCandidates();
   if(reviews.length){
    const keys=reviews.map(x=>'"'+x.key+'"').join(',');
    const known=await ledger('?select=delivery_key&delivery_key=in.'+encodeURIComponent('('+keys+')'),'GET');
    if(!Array.isArray(known))throw Error('review_ledger_unverified');
    const seen=new Set(known.map(x=>x.delivery_key));
    const next=reviews.find(x=>!seen.has(x.key));
    if(next)candidates.push({...next,kind:'alert'});
   }
  }catch{/* Fail closed for review delivery; preserve existing alerts. */}
 }
 if(!candidates.length)return {status:'no_alerts',sent:0,review_subscription:await subscription};
 // One read of bounded candidate keys, then atomic claims to handle concurrent invocations.
 const keys=candidates.slice(0,105).map(x=>'"'+x.key+'"').join(',');
 const known=await ledger('?select=delivery_key&delivery_key=in.'+encodeURIComponent('('+keys+')'),'GET');
 if(!Array.isArray(known))throw Error('telegram_ledger_readback_unverified');
 const seen=new Set(known.map(x=>x.delivery_key));
 let sent=0,uncertain=0;
 for(const item of candidates.filter(x=>!seen.has(x.key)).slice(0,4)){
  if(!await claimDelivery(item.key,item.kind))continue;
  try{const id=await sendOne(cfg,item.text,item.inline_keyboard);await markDelivery(item.key,'sent',id);sent++;}
  catch{uncertain++;try{await markDelivery(item.key,'uncertain');}catch{}}
 }
 return {status:uncertain?'delivery_uncertain':'checked',sent,uncertain,review_subscription:await subscription};
}
