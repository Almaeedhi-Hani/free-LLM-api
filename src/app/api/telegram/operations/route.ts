import {NextRequest,NextResponse} from 'next/server';
import {telegramPhase2Enabled,healthText,claimDelivery,markDelivery} from '@/lib/telegram-ops-notifier';
import {advancedEnabled,parseAdvanced,handleAdvanced,handleVoice,memorySummary,reviewMenu,reviewCard,handleReviewAction,type ReviewButton} from '@/lib/telegram-ops-advanced';
import {coordinator,coordinatorEnabled,core} from '@/lib/telegram/config';
import {dataFor} from '@/lib/telegram/operations-data';
import {send,boundedBody} from '@/lib/telegram/transport';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers});
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
  let message:string;let inline:ReviewButton[][]|undefined;
  if(command==='unknown'&&core.normalizeCommand((update as {message?:{text?:unknown}}).message?.text)==='/commandcenter'){
   message=coordinatorEnabled()?await coordinator.report(await dataFor('/commandcenter')):'غرفة القيادة غير مفعلة بعد.';
   if(coordinatorEnabled()&&advancedEnabled())try{message+='\n\n'+await memorySummary(cfg);}catch{message+='\n\nالذاكرة الاستراتيجية غير متاحة.';}
  }
  else if(action?.kind==='reviewlist'){const m=await reviewMenu();message=m.text;inline=m.inline_keyboard;}
  else if(action?.kind==='review'){const m=await reviewCard(action.key||'');message=m.text;inline=m.inline_keyboard;}
  else if(action&&['approve','reject','confirm'].includes(action.kind)){const m=await handleReviewAction(action,cfg,(update as {update_id:number}).update_id);message=m.text;inline=m.inline_keyboard;}
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
