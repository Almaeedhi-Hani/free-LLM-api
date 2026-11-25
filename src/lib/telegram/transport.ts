import type {NextRequest} from 'next/server';
import {telegramPhase2Enabled} from '@/lib/telegram-ops-notifier';
import {advancedEnabled} from '@/lib/telegram-ops-advanced';
import {core,coordinatorEnabled} from './config';

export async function send(cfg:NonNullable<ReturnType<typeof core.config>>,message:string,inline?:{text:string;callback_data:string}[][]){
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
export async function boundedBody(req:NextRequest):Promise<unknown>{
 if(!req.body)throw Error('missing_body');
 const reader=req.body.getReader();let length=0;const chunks:Uint8Array[]=[];
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>65536){await reader.cancel();throw Error('body_too_large');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }finally{reader.releaseLock();}
}
