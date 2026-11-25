import {randomBytes} from 'node:crypto';
import {getSupabaseCredentials} from '@/lib/storage-mode';
import {getContent,type SiteContent,type ContentDraft} from '@/lib/content-store';
import {assessGeoDraftCopy,splitGeoDraftReviewText,detectGeoDraftLocale} from '@/lib/geo-draft-quality';
import {officialCandidateUrls,checkOfficialUrlReachable,verifyHighRiskOfficialClaims} from '@/lib/geo/publication/official-evidence';
import {assessFaqCandidate,assessEditorialCandidate,publicEditorialFields} from '@/lib/geo/publication/preflight';
import {exactClaimCoverage} from '@/lib/geo-claim-evidence';
import {getCompetitorDomains} from '@/lib/source-policy-store';
import {isSaudiGovernmentCandidate} from '@/lib/editorial-official-source-search';
type Cfg={token:string;secret:string;chat:string;owner:string};
type Action={kind:string;decision?:string;id?:string;key?:string;code?:string};
export type ReviewButton={text:string;callback_data:string}|{text:string;url:string};
export type ReviewCard={text:string;inline_keyboard:ReviewButton[][]};
const cards=require('./telegram-ops-advanced-card.cjs') as {card:(input:Record<string,unknown>)=>ReviewCard;decisionCard:(text:string)=>ReviewCard};
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
 return {text:'📋 المراجعات المعلقة ('+items.length+')\nاختر المحتوى لعرض بطاقة المراجعة والأدلة والقرار.',inline_keyboard:[...first.map((x,i)=>[{text:(i+1)+'. '+x.title.slice(0,55),callback_data:'review:'+x.key}]),[{text:'لوحة الإدارة',url:dashboard}]]};
}
function buildReviewCard(items:Pending[],index:number):ReviewCard{
 const x=items[index];
 const full=Boolean(reviewText(x));
 const body=x.kind==='faq'?x.item.a:[x.item.summary,x.item.body,JSON.stringify(x.item.sections||[])].join('\n\n');
 return cards.card({key:x.key,title:x.title,kind:x.kind,body,refs:x.item.evidence_refs||[],eligible:canApprove(x),index,total:items.length,previous:items[index-1]?.key,next:items[index+1]?.key,full});
}
export async function reviewCard(key:string):Promise<ReviewCard>{
 const items=pending(await readContent()),index=items.findIndex(x=>x.key===key);
 if(index<0)return {text:'العنصر غير موجود أو تغير. أعد المراجعة.',inline_keyboard:[[{text:'قائمة المراجعات',callback_data:'reviewlist'}]]};
 return buildReviewCard(items,index);
}
export async function reviewNotificationCandidates(){
 const items=pending(await readContent());
 return items.slice(0,30).map((x,index)=>({key:'review-card:'+x.key,...buildReviewCard(items,index)}));
}
// Read-only, item-version-bound tools. No approval, content writes or workflow dispatch.
export async function reviewDiagnostics(a:Action):Promise<ReviewCard>{
 const items=pending(await readContent()),x=items.find(i=>i.key===a.key);
 const back:ReviewButton[][]=[[{text:'العودة للبطاقة',callback_data:'review:'+(a.key||'')}],[{text:'قائمة المراجعات',callback_data:'reviewlist'}]];
 if(!x)return {text:'العنصر تغير أو لم يعد معلقًا. افتح قائمة المراجعات.',inline_keyboard:[back[1]]};
 const rows:ReviewButton[][]=[];
 const body=x.kind==='faq'?x.item.a:x.item.body;
 const refs=x.item.evidence_refs||[];
 const item={body,evidence_refs:refs,claim_evidence:x.item.claim_evidence};
 const urls=officialCandidateUrls(item);
 const heading=x.title.slice(0,220);
 if(a.kind==='reasons'){
  const reasons:string[]=[];
  if(!reviewText(x))reasons.push('النص يتجاوز طول المراجعة الآمنة داخل Telegram.');
  if(x.kind==='faq'){
   if(x.item.risk_level!=='low')reasons.push('درجة المخاطر ليست منخفضة أو غير محددة.');
   if(splitGeoDraftReviewText(x.item.a).note)reasons.push('يتضمن النص ملاحظة تطلب التحقق قبل النشر.');
   const quality=assessGeoDraftCopy(x.item.q,x.item.a);
   if(!quality.publishable)reasons.push('فحص جودة النص: '+quality.issues.join(' | '));
  }else reasons.push('اعتماد المحتوى التحريري يتطلب بوابة الإدارة الحالية.');
  if(!urls.length)reasons.push('لا توجد أدلة حكومية مصنفة ضمن المصادر المحفوظة.');
  const auto=x.kind==='faq'?assessFaqCandidate(x.item):(await assessEditorialCandidate(x.item,await getCompetitorDomains().catch(()=>null),false)).reason;
  return {text:'📋 أسباب منع الاعتماد\n\n'+heading+'\n\n'+(canApprove(x)&&reviewText(x)?'طلب الاعتماد اليدوي متاح مع تأكيد منفصل.':'الاعتماد اليدوي عبر البوت غير متاح.')+'\n'+(reasons.map(v=>'• '+v).join('\n')||'لا توجد ملاحظات إضافية.')+'\n\nبوابة النشر الآلي (مستقلة): '+auto+'\nلم يتم تغيير حالة المحتوى.',inline_keyboard:back};
 }
 const reachable=await Promise.all(urls.map(url=>checkOfficialUrlReachable(url)));
 // Existing exact-quote verifier enforces 2 authority domains and bounded HTML reads.
 const proof=reachable.some(Boolean)&&item.claim_evidence?.length?await verifyHighRiskOfficialClaims(item):null;
 const coverage=proof?exactClaimCoverage(x.kind==='faq'?[body]:publicEditorialFields(x.item).split('\n'),proof.proofs):null;
 if(a.kind==='verify'){
  let discovery='لم يلزم البحث عن روابط إضافية.';
  if(!reachable.some(Boolean)){
   discovery='البحث عن مصادر مرشحة غير متاح.';
   const secret=process.env.ADMIN_SECRET||process.env.REVALIDATION_SECRET;
   if(secret)try{
    const lang=x.kind==='faq'?detectGeoDraftLocale(x.title):x.item.lang;
    const response=await fetch('https://free-llm-api-1-didl.onrender.com/api/admin/editorial-sources',{method:'POST',headers:{'x-admin-secret':secret,'Content-Type':'application/json'},body:JSON.stringify({title:x.title.slice(0,170),lang,...(x.kind==='editorial'?{primary_keyword:x.item.primary_keyword?.slice(0,160),target:x.item.target.slice(0,120)}:{})}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(16000)});
    if(response.ok){
     const data=await response.json();
     const candidates=Array.isArray(data.results)?data.results.filter((r:unknown):r is {url:string;title:string}=>!!r&&typeof r==='object'&&'url' in r&&typeof r.url==='string'&&isSaudiGovernmentCandidate(r.url)&&'title' in r&&typeof r.title==='string').slice(0,5):[];
     discovery=candidates.length?'عُثر على '+candidates.length+' روابط حكومية مرشحة فقط؛ لم تثبت الادعاءات.':'لم يعثر البحث على روابط حكومية مرشحة.';
     for(const c of candidates)rows.push([{text:'🔗 '+c.title.slice(0,55),url:c.url}]);
    }
   }catch{}
  }
  for(let i=0;i<urls.length;i++)rows.push([{text:(reachable[i]?'✓ متاح: ':'تعذر الوصول: ')+new URL(urls[i]).hostname,url:urls[i]}]);
  return {text:'🔍 نتيجة فحص المصادر الرسمية\n\n'+heading+'\n\nالمصادر الحكومية المحفوظة: '+urls.length+'\nالمتاحة الآن: '+reachable.filter(Boolean).length+'\nالاقتباسات المطابقة: '+(proof?.proofs.length||0)+'\nتغطية النص: '+(coverage?coverage.matched+' من '+coverage.total:'غير مثبتة')+'\n'+discovery+'\n\nالوصول للمصدر لا يثبت صحة الادعاء. لم يتم الاعتماد أو حفظ أدلة جديدة.',inline_keyboard:[...rows,...back]};
 }
 // A correction suggestion is deliberately non-mutating. Never invent a legal claim.
 const separated=x.kind==='faq'?splitGeoDraftReviewText(body):{answer:body,note:''};
 const tidy=separated.answer.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
 const revised=tidy!==body.trim()&&tidy.length>0;
 const result=coverage?.complete?'تغطية النص الحرفية متاحة؛ لا تعني الموافقة أو التحقق الدلالي.':'الأدلة غير كافية لإعادة صياغة الحقائق بأمان. يلزم ربط كل ادعاء بمصدر رسمي مناسب.';
 return {text:('✏️ اقتراح تصحيح — غير محفوظ\n\n'+heading+'\n\n'+result+'\n\n'+(revised?'معاينة تنسيق النص دون إضافة حقائق:\n'+tidy+(separated.note?'\n\nملاحظة المراجعة المحتفظ بها: '+separated.note:''):'لم أجد تعديلًا شكليًا آمنًا؛ لا أقترح نصًا بديلًا غير مستند إلى أدلة.')+'\n\nالمسودة الأصلية باقية دون تغيير.').slice(0,3500),inline_keyboard:[[{text:'فحص المصادر',callback_data:'verify:'+x.key}],...back]};
}
export async function handleReviewAction(a:Action,cfg:Cfg,updateId:number):Promise<ReviewCard>{
 return cards.decisionCard(await handleAdvanced(a,cfg,updateId));
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

export {handleVoice} from './telegram/voice';
