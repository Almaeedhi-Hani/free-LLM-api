import {claimDelivery,markDelivery} from '@/lib/telegram-ops-notifier';
type Cfg={token:string;secret:string;chat:string;owner:string};
type Action={kind:string;decision?:string;id?:string;key?:string;code?:string};
const core=require('../telegram-ops-advanced-core.cjs') as {parse:(s:unknown)=>Action|null;fingerprint:(kind:string,item:unknown)=>string;voiceSuggestion:(s:string)=>string|null;safeDecision:(s:string)=>boolean};

type VoiceProvider={id:string;label:string};
const voiceProviders=require('../telegram-voice-providers.cjs') as {voiceInput:(update:unknown)=>{fileId:string;duration:number;size:number;slot:string}|null;MAX_VOICE_BYTES:number;providers:(env:NodeJS.ProcessEnv)=>VoiceProvider[];transcribe:(pool:VoiceProvider[],audio:Buffer,io:{claim:(id:string)=>Promise<boolean>;mark:(id:string,state:'sent'|'uncertain')=>Promise<void>})=>Promise<{text:string;provider:string}|null>};
export async function handleVoice(update:unknown,cfg:Cfg){
 if(process.env.TELEGRAM_OPS_VOICE_ENABLED!=='true')return 'الصوت غير مفعل. يُرسل التسجيل إلى مزود التفريغ المجاني المعتمد فقط.';
 const pool=voiceProviders.providers(process.env);
 if(!pool.length)return 'لا يوجد مزود صوتي معتمد بوضع مجاني فقط.';
 const v=voiceProviders.voiceInput(update);
 if(!v)return 'أرسل تسجيلًا صوتيًا لا يتجاوز 120 ثانية و4 ميغابايت.';
 const slot=v.slot;
 if(!await claimDelivery(slot,'command'))return 'سبق استقبال هذا التسجيل؛ لا تتم إعادة معالجته تلقائيًا.';
 try{
  const meta=await fetch('https://api.telegram.org/bot'+cfg.token+'/getFile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file_id:v.fileId}),redirect:'error',signal:AbortSignal.timeout(5000),cache:'no-store'});
  const j=await meta.json(),path=j?.result?.file_path;
  if(!meta.ok||j?.ok!==true||typeof path!=='string'||!/^voice\/[A-Za-z0-9_-]+\.(ogg|oga|opus)$/.test(path))throw Error('invalid_voice_file');
  const file=await fetch('https://api.telegram.org/file/bot'+cfg.token+'/'+path,{redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!file.ok||!file.body)throw Error('voice_unavailable');
  const reader=file.body.getReader(),parts:Buffer[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>voiceProviders.MAX_VOICE_BYTES){await reader.cancel();throw Error('voice_limit');}parts.push(Buffer.from(value));}}finally{reader.releaseLock();}
  if(size<1)throw Error('empty_voice');
  const result=await voiceProviders.transcribe(pool,Buffer.concat(parts),{claim:id=>claimDelivery(slot+':'+id,'command'),mark:(id,state)=>markDelivery(slot+':'+id,state)});
  if(!result)throw Error('transcription_unavailable');
  const transcript=result.text,suggestion=core.voiceSuggestion(transcript);
  await markDelivery(slot,'sent');
  return 'المزود: '+result.provider+'\nالنص المفرغ (لم ينفذ أي إجراء):\n'+transcript+(suggestion?'\n\nأرسل الأمر التالي للتأكيد: '+suggestion:'\nلم يطابق أمر قراءة آمنًا؛ استخدم /help.');
 }catch{try{await markDelivery(slot,'uncertain');}catch{}return 'تعذر تفريغ التسجيل ضمن المزودين المجانيين. لا إعادة بعد نتيجة غير مؤكدة ولا تنفيذ للأوامر.';}
}
