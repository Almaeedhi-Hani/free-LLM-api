'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {providers,request,transcribe}=require('../src/lib/telegram-voice-providers.cjs');
const now=Date.parse('2026-11-24T00:00:00Z'),e={TELEGRAM_VOICE_QWEN_FREE_ONLY:'true',TELEGRAM_VOICE_QWEN_KEY:'fake',TELEGRAM_VOICE_QWEN_FREE_UNTIL:'2027-01-01T00:00:00Z',TELEGRAM_VOICE_QWEN_WORKSPACE:'ws-test',TELEGRAM_VOICE_GROQ_FREE_ONLY:'true',TELEGRAM_VOICE_GROQ_KEY:'fake',TELEGRAM_VOICE_CLOUDFLARE_FREE_ONLY:'true',TELEGRAM_VOICE_CLOUDFLARE_KEY:'fake',TELEGRAM_VOICE_CLOUDFLARE_ACCOUNT:'a'.repeat(32)};
const audio=Buffer.from('OggS-test');
test('keys alone are insufficient; expired or malformed Qwen configuration is excluded',()=>{
 assert.deepEqual(providers({TELEGRAM_VOICE_GROQ_KEY:'fake'},now),[]);
 assert.deepEqual(providers(e,now).map(x=>x.id),['qwen','groq','cloudflare']);
 for(const patch of [{TELEGRAM_VOICE_QWEN_FREE_UNTIL:'2020-01-01T00:00:00Z'},{TELEGRAM_VOICE_QWEN_WORKSPACE:'evil.com/path'},{TELEGRAM_VOICE_QWEN_FREE_ONLY:'false'}])assert.deepEqual(providers({...e,...patch},now).map(x=>x.id),['groq','cloudflare']);
});
test('private byte upload, fixed hosts and no Telegram URL',()=>{
 for(const p of providers(e,now)){const q=request(p,audio);assert(!q.url.includes('telegram'));assert(!q.url.includes('fake'));assert.equal(q.headers.Authorization,'Bearer fake');}
 assert.match(request(providers(e,now)[0],audio).body,/data:audio\/ogg;base64/);
});
test('explicit quota refusal falls back; successful provider identified',async()=>{
 const seen=[],marks=[];
 const result=await transcribe(providers(e,now),audio,{claim:async id=>{seen.push(id);return true;},mark:async(...x)=>marks.push(x),fetcher:async url=>url.includes('aliyuncs')?{status:429,ok:false}:{status:200,ok:true,json:async()=>({text:'حالة الأنظمة'})}});
 assert.deepEqual(seen,['qwen','groq']);assert.deepEqual(result,{text:'حالة الأنظمة',provider:'Groq Whisper'});assert.deepEqual(marks,[['qwen','uncertain'],['groq','sent']]);
});
test('uncertain failure does not disclose recording to a second provider',async()=>{
 for(const fetcher of [async()=>{throw Error('timeout');},async()=>({status:503,ok:false}),async()=>({status:200,ok:true,json:async()=>({})})]){
  const seen=[];assert.equal(await transcribe(providers(e,now),audio,{claim:async id=>{seen.push(id);return true;},mark:async()=>{},fetcher}),null);assert.deepEqual(seen,['qwen']);
 }
});
test('duplicate claim skipped and all unavailable fails closed',async()=>{
 const seen=[];assert.equal(await transcribe(providers(e,now),audio,{claim:async()=>false,mark:async()=>{},fetcher:async x=>{seen.push(x);throw Error('unexpected');}}),null);assert.deepEqual(seen,[]);
});
