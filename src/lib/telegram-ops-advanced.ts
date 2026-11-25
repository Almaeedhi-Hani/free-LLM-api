import {randomBytes} from 'node:crypto';
import {getSupabaseCredentials} from '@/lib/storage-mode';
import {getContent,type SiteContent,type ContentDraft} from '@/lib/content-store';
import {assessGeoDraftCopy,splitGeoDraftReviewText} from '@/lib/geo-draft-quality';
import {claimDelivery,markDelivery} from '@/lib/telegram-ops-notifier';
type Cfg={token:string;secret:string;chat:string;owner:string};
type Action={kind:string;decision?:string;id?:string;key?:string;code?:string};
const core=require('./telegram-ops-advanced-core.cjs') as {parse:(s:unknown)=>Action|null;fingerprint:(kind:string,item:unknown)=>string;voiceSuggestion:(s:string)=>string|null;safeDecision:(s:string)=>boolean};
export function advancedEnabled(){return process.env.TELEGRAM_OPS_ADVANCED_ENABLED==='true';}
export function parseAdvanced(text:unknown){return advancedEnabled()?core.parse(text):null;}
const enc=encodeURIComponent;
async function db(table:'telegram_ops_memory'|'telegram_ops_review_intents',query:string,method='GET',body?:object,prefer='return=representation'){
 const c=getSupabaseCredentials();if(!c)throw Error('storage_unavailable');
 const r=await fetch(c.url+'/rest/v1/'+table+'?'+query,{method,headers:{apikey:c.key,Authorization:'Bearer '+c.key,'Content-Type':'application/json',Prefer:prefer},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000)});
 if(!r.ok)throw Error('storage_unavailable');const j=await r.json();if(!Array.isArray(j))throw Error('storage_unverified');return j;
}
function owner(cfg:Cfg){return 'owner_id=eq.'+enc(cfg.owner);}
async function readContent(){if(!getSupabaseCredentials())throw Error('storage_unavailable');return getContent();}
function pending(c:SiteContent){
 return [...c.drafts.filter(x=>x.status==='pending').map(item=>({kind:'faq' as const,key:core.fingerprint('faq',item),item,title:item.q})),...c.editorialItems.filter(x=>x.status==='pending').map(item=>({kind:'editorial' as const,key:core.fingerprint('editorial',item),item,title:item.title}))];
}
type Pending=ReturnType<typeof pending>[number];
function reviewText(x:Pending){
 const raw=x.kind==='faq'?x.item.q+'\n\n'+x.item.a+'\n\nالأدلة المحفوظة:\n'+(x.item.evidence_refs||[]).map(y=>[y.label,y.url].filter(Boolean).join(' — ')).join('\n'):x.item.title+'\n\n'+x.item.summary+'\n\n'+x.item.body+'\n\n'+JSON.stringify(x.item.sections||[])+'\n\nالأدلة المحفوظة:\n'+(x.item.evidence_refs||[]).map(y=>[y.label,y.url].filter(Boolean).join(' — ')).join('\n');
 return raw.length<=3000?raw:null;
}
function canApprove(x:Pending){
 if(x.kind!=='faq')return false; // Official-source selection remains in the existing editorial dashboard.
 return x.item.risk_level==='low'&&!splitGeoDraftReviewText(x.item.a).note&&assessGeoDraftCopy(x.item.q,x.item.a.trim()).publishable;
}
const dashboard='https://free-llm-api-1-didl.onrender.com/admin/dashboard';
function instruction(x:Pending){return '\n\nللرفض: /reject '+x.key+(canApprove(x)?'\nللاعتماد بعد مراجعة النص والأدلة: /approve '+x.key:'\nالاعتماد يتطلب مراجعة لوحة الإدارة: '+dashboard);}
async function closeIntent(cfg:Cfg,code:string,state:'applied'|'blocked'|'uncertain',outcome:string){
 const a=await db('telegram_ops_review_intents',owner(cfg)+'&code=eq.'+enc(code)+'&state=eq.claimed','PATCH',{state,outcome,completed_at:new Date().toISOString()});
 if(a.length!==1||a[0].state!==state)throw Error('audit_unverified');
}
export async function memorySummary(cfg:Cfg){
 const a=await db('telegram_ops_memory',owner(cfg)+'&archived_at=is.null&select=id,decision,created_at&order=created_at.desc&limit=5');
 return a.length?'قرارات المالك المحفوظة (أحدث 5؛ لا تنفذ تلقائيًا):\n'+a.map(x=>'• '+String(x.decision)+'\n'+String(x.created_at).slice(0,10)+' — /forget '+x.id).join('\n'):'لا توجد قرارات محفوظة.';
}
export async function reviewMenu(){
 const c=await readContent(),items=pending(c),first=items.slice(0,10);
 return {text:'المراجعات المعلقة ('+items.length+') — أول 10 (النص الأصلي):\n'+(first.map((x,i)=>(i+1)+'. '+x.title.slice(0,180)+'\n/review '+x.key).join('\n')||'لا توجد مراجعات')+'\nللبقية: '+dashboard,inline_keyboard:first.map((x,i)=>[{text:'مراجعة '+(i+1),callback_data:'review:'+x.key}])};
}
export async function handleAdvanced(a:Action,cfg:Cfg,updateId:number):Promise<string>{
 if(a.kind==='memory')return memorySummary(cfg);
 if(a.kind==='remember'){
  if(!a.decision||!core.safeDecision(a.decision))return 'لا تحفظ مفاتيح أو كلمات مرور في الذاكرة. الحد 1000 حرف.';
  const rows=await db('telegram_ops_memory','on_conflict=owner_id,update_id','POST',{owner_id:cfg.owner,decision:a.decision,update_id:updateId},'resolution=ignore-duplicates,return=representation');
  if(rows.length===0)return 'سبق تسجيل هذا الطلب.';
  if(rows.length!==1||rows[0].decision!==a.decision)throw Error('memory_unverified');
  return 'تم حفظ القرار كما كتبته، وليس كأمر تنفيذ:\n'+a.decision;
 }
 if(a.kind==='forget'){
  const rows=await db('telegram_ops_memory',owner(cfg)+'&id=eq.'+enc(a.id||'')+'&archived_at=is.null','PATCH',{archived_at:new Date().toISOString()});
  return rows.length===1?'تمت أرشفة القرار وإزالته من الذاكرة النشطة.':'لا يوجد قرار نشط بهذا الرقم.';
 }
 if(a.kind==='reviewlist'){
  return (await reviewMenu()).text;
 }
 if(a.kind==='review'||a.kind==='approve'||a.kind==='reject'){
  const c=await readContent(),items=pending(c).filter(x=>x.key===a.key);
  if(items.length!==1)return 'العنصر غير موجود أو تغير. أعد /reviewlist.';
  const x=items[0],preview=reviewText(x);
  if(!preview)return 'النص طويل للمراجعة الآمنة في Telegram. افتح '+dashboard;
  if(a.kind==='review')return preview+instruction(x);
  if(a.kind==='approve'&&!canApprove(x))return 'لا يمكن اعتماد هذا العنصر عبر البوت؛ راجع المصادر وشروط النشر في '+dashboard;
  const code=randomBytes(8).toString('hex');
  const rows=await db('telegram_ops_review_intents','select=code,state','POST',{code,owner_id:cfg.owner,item_key:x.key,item_kind:x.kind,decision:a.kind,content_version:c.updatedAt,expires_at:new Date(Date.now()+10*60000).toISOString()});
  if(rows.length!==1||rows[0].code!==code)throw Error('intent_unverified');
  return 'راجع النص المحدد قبل '+(a.kind==='approve'?'اعتماده ونشره':'رفضه')+':\n\n'+preview+'\n\nللتأكيد الصريح خلال 10 دقائق: /confirm '+code+'\nعدم التأكيد يعني عدم التنفيذ.';
 }
 if(a.kind==='confirm'){
  const code=a.code||'';
  const rows=await db('telegram_ops_review_intents',owner(cfg)+'&code=eq.'+enc(code)+'&state=eq.pending&expires_at=gt.'+enc(new Date().toISOString()),'PATCH',{state:'claimed'});
  if(rows.length!==1)return 'انتهى التأكيد أو سبق استخدامه. اطلب مراجعة جديدة.';
  const intent=rows[0];
  let mutationStarted=false;
  try{
   const c=await readContent(),matches=pending(c).filter(x=>x.key===intent.item_key&&x.kind===intent.item_kind);
   if(c.updatedAt!==intent.content_version||matches.length!==1){await closeIntent(cfg,code,'blocked','version_changed');return 'تغير المحتوى؛ لم ينفذ القرار. أعد المراجعة.';}
   const x=matches[0],approve=intent.decision==='approve';
   if(!reviewText(x)||(approve&&!canApprove(x))){await closeIntent(cfg,code,'blocked','review_gate');return 'رفضت بوابة الأمان التنفيذ؛ راجع لوحة الإدارة.';}
   const patch:Record<string,unknown>={expectedUpdatedAt:c.updatedAt};
   if(x.kind==='faq'){
    const draft=x.item as ContentDraft;
    if(c.drafts.filter(d=>d.q===draft.q).length!==1||(approve&&c.faqs.some(f=>f.q===draft.q))){await closeIntent(cfg,code,'blocked','duplicate_question');return 'يوجد سؤال مكرر أو منشور مسبقًا؛ لم ينفذ القرار.';}
    patch.drafts=c.drafts.map(d=>d===draft?{...d,status:approve?'approved':'rejected'}:d);
    if(approve)patch.faqs=[...c.faqs,{q:draft.q,a:draft.a.trim(),approval_method:'human',source_verification:'not_independently_checked'}];
   }else{
    patch.editorialItems=c.editorialItems.map(d=>d===x.item?{...d,status:'rejected',reviewedAt:new Date().toISOString()}:d);
   }
   const secret=process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET;
   if(!secret){await closeIntent(cfg,code,'blocked','admin_config');return 'إعدادات الإدارة غير متاحة.';}
   mutationStarted=true;
   const r=await fetch('https://free-llm-api-1-didl.onrender.com/api/admin/content',{method:'POST',headers:{'x-admin-secret':secret,'Content-Type':'application/json'},body:JSON.stringify(patch),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
   if([400,401,409,422].includes(r.status)){await closeIntent(cfg,code,'blocked','admin_gate_'+r.status);return 'رفضت بوابة الإدارة القرار؛ لم يتم اعتماده. راجع لوحة الإدارة.';}
   if(!r.ok)throw Error('mutation_unconfirmed');
   const result=await r.json();if(result.status!=='updated')throw Error('mutation_unconfirmed');
   const saved=await readContent();
   let verified=false;
   if(x.kind==='faq'){
    const draft=x.item;
    verified=saved.drafts.some(d=>d.q===draft.q&&d.a===draft.a&&d.status===(approve?'approved':'rejected'))&&(!approve||saved.faqs.some(f=>f.q===draft.q&&f.a===draft.a.trim()));
   }else{
    const item=x.item;verified=saved.editorialItems.some(d=>d.id===item.id&&d.status==='rejected');
   }
   if(!verified)throw Error('readback_unconfirmed');
   await closeIntent(cfg,code,'applied','saved_readback_verified');
   return approve?'تم اعتماد السؤال وحفظه عبر بوابة الإدارة، وتحققنا من السجل.':'تم رفض العنصر والتحقق من حفظ القرار.';
  }catch{
   try{await closeIntent(cfg,code,mutationStarted?'uncertain':'blocked',mutationStarted?'manual_readback_required':'preflight_failed');}catch{}
   return mutationStarted?'تعذر تأكيد النتيجة. لا تكرر التأكيد؛ تحقق من لوحة الإدارة.':'تعذر التحقق قبل التنفيذ. لم يرسل طلب تعديل.';
  }
 }
 return 'الأمر غير مدعوم.';
}
type VoiceProvider={id:string;label:string};
const voiceProviders=require('./telegram-voice-providers.cjs') as {voiceInput:(update:unknown)=>{fileId:string;duration:number;size:number;slot:string}|null;MAX_VOICE_BYTES:number;providers:(env:NodeJS.ProcessEnv)=>VoiceProvider[];transcribe:(pool:VoiceProvider[],audio:Buffer,io:{claim:(id:string)=>Promise<boolean>;mark:(id:string,state:'sent'|'uncertain')=>Promise<void>})=>Promise<{text:string;provider:string}|null>};
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
