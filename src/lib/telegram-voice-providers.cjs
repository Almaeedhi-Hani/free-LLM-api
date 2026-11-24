'use strict';
// No provider is eligible merely because an API key exists. The operator must
// verify the account's hard free-only setting and explicitly opt in.
const enabled=(e,p)=>e['TELEGRAM_VOICE_'+p+'_FREE_ONLY']==='true';
const validUntil=(s,now)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)&&Date.parse(s)>now;
const MAX_VOICE_SECONDS=120,MAX_VOICE_BYTES=4*1024*1024;
function voiceInput(update){
 const id=update?.update_id,v=update?.message?.voice;
 if(!Number.isSafeInteger(id)||id<0||!v||typeof v.file_id!=='string'||!v.file_id.length||v.file_id.length>256||!Number.isInteger(v.duration)||v.duration<1||v.duration>MAX_VOICE_SECONDS||!Number.isInteger(v.file_size)||v.file_size<1||v.file_size>MAX_VOICE_BYTES)return null;
 return {fileId:v.file_id,duration:v.duration,size:v.file_size,slot:'voice:update:'+id};
}
function providers(e,now=Date.now()){
 const out=[];
 if(enabled(e,'QWEN')&&e.TELEGRAM_VOICE_QWEN_KEY&&validUntil(e.TELEGRAM_VOICE_QWEN_FREE_UNTIL,now)&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(e.TELEGRAM_VOICE_QWEN_WORKSPACE||''))out.push({id:'qwen',label:'Qwen3-ASR-Flash',key:e.TELEGRAM_VOICE_QWEN_KEY,workspace:e.TELEGRAM_VOICE_QWEN_WORKSPACE});
 if(enabled(e,'GROQ')&&e.TELEGRAM_VOICE_GROQ_KEY)out.push({id:'groq',label:'Groq Whisper',key:e.TELEGRAM_VOICE_GROQ_KEY});
 if(enabled(e,'CLOUDFLARE')&&e.TELEGRAM_VOICE_CLOUDFLARE_KEY&&/^[a-f0-9]{32}$/.test(e.TELEGRAM_VOICE_CLOUDFLARE_ACCOUNT||''))out.push({id:'cloudflare',label:'Cloudflare Whisper',key:e.TELEGRAM_VOICE_CLOUDFLARE_KEY,account:e.TELEGRAM_VOICE_CLOUDFLARE_ACCOUNT});
 return out;
}
function request(p,audio){
 const auth={Authorization:'Bearer '+p.key};
 if(p.id==='qwen')return {url:'https://'+p.workspace+'.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({model:'qwen3-asr-flash',messages:[{role:'user',content:[{type:'input_audio',input_audio:{data:'data:audio/ogg;base64,'+audio.toString('base64')}}]}],stream:false,asr_options:{language:'ar',enable_itn:false}})};
 if(p.id==='groq'){
  const form=new FormData();form.append('file',new Blob([audio],{type:'audio/ogg'}),'voice.ogg');form.append('model','whisper-large-v3-turbo');form.append('response_format','json');
  return {url:'https://api.groq.com/openai/v1/audio/transcriptions',headers:auth,body:form};
 }
 if(p.id==='cloudflare')return {url:'https://api.cloudflare.com/client/v4/accounts/'+p.account+'/ai/run/@cf/openai/whisper-large-v3-turbo',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({audio:audio.toString('base64'),task:'transcribe',language:'ar'})};
 throw Error('unknown_provider');
}
function extract(id,j){
 const t=id==='qwen'?j?.choices?.[0]?.message?.content:id==='groq'?j?.text:id==='cloudflare'&&j?.success===true?j?.result?.text:null;
 if(typeof t!=='string'||!t.trim())return null;
 const text=t.trim();return text.length>3000?text.slice(0,3000)+'… (تم اختصار النص لطوله)':text;
}
// Only explicit pre-processing refusals permit failover. Ambiguous network,
// timeout, 5xx, or malformed-success results stop; never resend after uncertain processing.
async function transcribe(pool,audio,{fetcher=fetch,claim,mark}){
 for(const p of pool.slice(0,3)){
  if(!await claim(p.id))continue;
  try{
   const {url,headers,body}=request(p,audio);
   const r=await fetcher(url,{method:'POST',headers,body,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)});
   if([401,402,403,429].includes(r.status)){await mark(p.id,'uncertain');continue;}
   if(!r.ok)throw Error('unconfirmed');
   const t=extract(p.id,await r.json());
   if(!t)throw Error('unconfirmed');
   await mark(p.id,'sent');return {text:t,provider:p.label};
  }catch{try{await mark(p.id,'uncertain');}catch{}return null;}
 }
 return null;
}
module.exports={providers,request,extract,transcribe,voiceInput,MAX_VOICE_SECONDS,MAX_VOICE_BYTES};
