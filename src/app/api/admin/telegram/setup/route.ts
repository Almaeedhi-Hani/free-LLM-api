import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
const core=require('../../../../../lib/telegram-ops-core.cjs') as {config:(env:NodeJS.ProcessEnv)=>{token:string;secret:string;chat:string;owner:string}|null};
export const runtime='nodejs';
export const dynamic='force-dynamic';
const endpoint='https://free-llm-api-1-didl.onrender.com/api/telegram/operations';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
function json(body:object,status=200){return NextResponse.json(body,{status,headers});}
export function GET(){
 return new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ربط غرفة العمليات</title><style>body{font:16px system-ui;max-width:480px;margin:40px auto;padding:20px;color:#143b34}input,button{box-sizing:border-box;width:100%;padding:14px;margin:12px 0;font:inherit}button{background:#075746;color:white;border:0;border-radius:8px}</style><h1>ربط غرفة العمليات</h1><p>افتح البوت الخاص بك واضغط Start أولاً. أدخل مفتاح لوحة الإدارة، وليس مفتاح البوت. سيتم إرسال رسالة اختبار لحساب المالك فقط ثم تسجيل الاتصال.</p><form method="post"><label>مفتاح لوحة الإدارة<input type="password" name="admin" required maxlength="512" autocomplete="off"></label><button>تحقق واربط البوت</button></form></html>',{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
}
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin!=='https://free-llm-api-1-didl.onrender.com')return json({error:'invalid_origin'},403);
 if(!req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return json({error:'invalid_content_type'},415);
 const reader=req.body?.getReader();if(!reader)return json({error:'invalid_body'},400);
 let length=0;const parts:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();return json({error:'invalid_body'},400);}parts.push(value);}}catch{return json({error:'invalid_body'},400);}finally{reader.releaseLock();}
 const provided=new URLSearchParams(Buffer.concat(parts).toString('utf8')).get('admin')||'';
 const expected=Buffer.from(process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET||'');const actual=Buffer.from(provided);
 if(!expected.length||expected.length!==actual.length||!timingSafeEqual(expected,actual))return json({error:'unauthorized'},401);
 const cfg=core.config(process.env);
 const username=process.env.TELEGRAM_BOT_USERNAME||'';
 if(!cfg||!username)return json({error:'configuration_incomplete'},503);
 async function api(method:string,body:object){
  const r=await fetch('https://api.telegram.org/bot'+cfg!.token+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4500)});
  const j=await r.json();if(!r.ok||j?.ok!==true)throw Error('telegram_request_failed');return j.result;
 }
 try{
  const me=await api('getMe',{});if(me?.is_bot!==true||String(me.username).toLowerCase()!==username.toLowerCase())return json({error:'bot_identity_mismatch'},409);
  const chat=await api('getChat',{chat_id:cfg.chat});
  if(chat?.type!=='private'||String(chat.id)!==cfg.owner)return json({error:'owner_chat_mismatch'},409);
  const existing=await api('getWebhookInfo',{});
  if(existing?.url&&existing.url!==endpoint)return json({error:'existing_webhook_conflict'},409);
  const sent=await api('sendMessage',{chat_id:cfg.chat,text:'تم التحقق من حساب المالك. غرفة عمليات Invest in Saudi — رسالة اختبار آمنة.'});
  if(String(sent?.chat?.id)!==cfg.chat||sent?.chat?.type!=='private'||!Number.isSafeInteger(sent?.message_id))return json({error:'test_delivery_unconfirmed'},503);
  await api('setWebhook',{url:endpoint,secret_token:cfg.secret,allowed_updates:['message'],drop_pending_updates:false});
  const info=await api('getWebhookInfo',{});
  if(info?.url!==endpoint)return json({error:'webhook_unconfirmed',test_delivered:true},503);
  return json({ok:true,bot:'@'+me.username,test_delivered:true,webhook_verified:true,next:'أرسل /status إلى البوت للتحقق من الأوامر'});
 }catch{return json({error:'telegram_setup_unconfirmed',instruction:'تأكد من الضغط على Start ومن إعدادات البوت. قد تكون رسالة الاختبار وصلت؛ لم يتم تأكيد الربط الكامل.'},503);}
}
