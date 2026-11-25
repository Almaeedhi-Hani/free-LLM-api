'use strict';
const {timingSafeEqual}=require('node:crypto');
const commands={
 '/start':'القائمة الرئيسية','/help':'الأوامر','/status':'حالة الأنظمة','/brief':'الإحاطة الإدارية',
 '/market':'المنافسون والكلمات','/opportunities':'الفرص والأهداف','/published':'المحتوى المنشور',
 '/reviews':'المسودات المعلقة','/advice':'توصيات المستشار'
};
const buttonRows=[
 [['/status','حالة الأنظمة'],['/brief','التقرير الإداري']],
 [['/market','استخبارات السوق'],['/opportunities','الفرص والأهداف']],
 [['/published','المحتوى المنشور'],['/reviews','المسودات المعلقة']],
 [['/advice','توصيات المستشار'],['/help','المساعدة']]
];
const advancedRows=[[['/memory','الذاكرة الاستراتيجية'],['/reviewlist','مراجعة المحتوى']]];
const coordinatorRows=[[['/commandcenter','غرفة القيادة']]];
const aliases=new Map([...buttonRows,...advancedRows,...coordinatorRows].flat().map(([cmd,label])=>[label,cmd]));
function normalizeCommand(text){const value=typeof text==='string'?text.trim():'';return aliases.get(value)||value;}
function keyboard(advanced=false,coordinator=false){return {keyboard:[...buttonRows,...(advanced?advancedRows:[]),...(coordinator?coordinatorRows:[])].map(row=>row.map(([,text])=>({text}))),resize_keyboard:true,is_persistent:true};}
const menu=Object.entries(commands).filter(([k])=>!['/start','/help'].includes(k)).map(([k,v])=>k+' — '+v).join('\n');
function config(env){
 const token=env.TELEGRAM_BOT_TOKEN||'',secret=env.TELEGRAM_WEBHOOK_SECRET||'',
 chat=env.TELEGRAM_OWNER_CHAT_ID||'',owner=env.TELEGRAM_OWNER_USER_ID||'';
 if(env.TELEGRAM_OPS_ENABLED!=='true'||!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)||! /^[A-Za-z0-9_-]{32,256}$/.test(secret)||!/^\d{1,16}$/.test(chat)||chat!==owner)return null;
 return {token,secret,chat,owner};
}
function authentic(expected,supplied){
 const a=Buffer.from(expected||''),b=Buffer.from(supplied||'');
 return a.length>0&&a.length===b.length&&timingSafeEqual(a,b);
}
function reviewCallback(update,cfg){
 const q=update?.callback_query;
 if(!Number.isSafeInteger(update?.update_id)||!q||q.from?.is_bot!==false||String(q.from?.id)!==cfg.owner||q.message?.chat?.type!=='private'||String(q.message.chat.id)!==cfg.chat||typeof q.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(q.id)||typeof q.data!=='string'||!/^review:[a-f0-9]{24}$/.test(q.data))return null;
 return {id:q.id,update:{update_id:update.update_id,message:{chat:q.message.chat,from:q.from,text:'/review '+q.data.slice(7)}}};
}
function command(update,cfg){
 const m=update?.message;
 if(!Number.isSafeInteger(update?.update_id)||!m||m.chat?.type!=='private'||String(m.chat.id)!==cfg.chat||String(m.from?.id)!==cfg.owner||m.from?.is_bot!==false)return null;
 if(m.voice)return 'voice';
 if(typeof m.text!=='string')return null;
 const value=normalizeCommand(m.text);
 return Object.hasOwn(commands,value)?value:'unknown';
}
const clean=(v)=>String(v??'غير متاح').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,240);
const state=(v)=>({success:'ناجح',success_with_data:'ناجح مع بيانات',success_no_data:'ناجح دون بيانات',completed:'مكتمل',failed:'فشل',error:'خطأ',partial:'جزئي',running:'قيد التنفيذ',published:'منشور',idle:'خامل'}[v]||'غير مؤكد');
const stamp=(v)=>{const t=Date.parse(v||'');return Number.isFinite(t)?new Intl.DateTimeFormat('ar-SA',{calendar:'gregory',timeZone:'Asia/Riyadh',dateStyle:'short',timeStyle:'short'}).format(new Date(t)):'لا يوجد وقت مؤكد'};
const latest=(name,record,time)=>name+': '+(record?state(record.status)+' — '+stamp(record[time]):'لا توجد نتيجة مؤكدة');
const list=(items,format)=>items===null?'المصدر غير متاح':items.length?items.slice(0,8).map((x,i)=>(i+1)+'. '+format(x)).join('\n'):'لا توجد سجلات';
function render(cmd,d){
 if(cmd==='voice')return 'الأوامر الصوتية لم تُفعّل بعد. استخدم الأوامر النصية.\n'+menu;
 if(cmd==='/start'||cmd==='/help'||cmd==='unknown')return 'غرفة عمليات Invest in Saudi\n'+menu+'\n'+(d.advanced?'القراءة متاحة، وحفظ القرارات صريح. الموافقات المؤهلة تتطلب مراجعة وتأكيدًا؛ المحتوى التحريري والعالي المخاطر من لوحة الإدارة.':'الأوامر الحالية للقراءة فقط؛ لا يتم اعتماد أو نشر المحتوى من البوت.');
 const head='Invest in Saudi | غرفة العمليات\n'+stamp(d.now)+'\n\n';
 const statuses=()=>[
 latest('Market Radar',d.radar,'finished_at'),
 latest('GEO',d.geo,'lastRun'),
 latest('GSC',d.gsc,'checked_at'),
 latest('النشر التحريري',d.publication,'published_at'),
 'ظهور الذكاء الاصطناعي: '+(d.ai?clean(d.ai.verification_status)+' — '+stamp(d.ai.observed_at):'لا توجد نتيجة مؤكدة'),
 'Watchdog: غير متحقق من مصدر مستقل في هذه النسخة',
 'الحالات أعلاه آخر سجلات متاحة وليست تأكيدًا على صحة النظام الآن.'
 ].join('\n');
 const statusText=()=>d.healthSummary?d.healthSummary+'\n'+latest('النشر التحريري',d.publication,'published_at')+'\nظهور الذكاء الاصطناعي: '+(d.ai?clean(d.ai.verification_status)+' — '+stamp(d.ai.observed_at):'لا توجد نتيجة مؤكدة')+'\nالحالات مبنية على السجلات المحفوظة وليست تحققًا لحظيًا.':statuses();
 if(cmd==='/status')return head+statusText();
 if(cmd==='/brief')return head+statusText()+'\n\nالمسودات المعلقة: '+(d.pending??'غير متاح')+'\nالروابط المنشورة: '+(d.publishedCount??'غير متاح')+'\nالتقرير الأسبوعي المحفوظ: '+(d.weekly?.verified_at?clean(d.weekly.week_key)+' (متحقق)':'غير مؤكد')+'\n\nأبرز الفرص المسجلة (بلغة المصدر):\n'+list(d.opportunities,x=>clean(x.title));
 if(cmd==='/market')return head+'أحدث المنافسين المسجلين (عينة):\n'+list(d.competitors,x=>clean(x.name)+' — '+clean(x.domain))+'\n\nأحدث الكلمات (عينة):\n'+list(d.keywords,x=>clean(x.term));
 if(cmd==='/opportunities')return head+'أبرز الفرص بحسب الدرجة:\n'+list(d.opportunities,x=>clean(x.title))+'\n\nأحدث الأهداف المفتوحة:\n'+list(d.goals,x=>clean(x.title));
 if(cmd==='/published')return head+'أحدث روابط المحتوى:\n'+list(d.links,x=>clean(x.title)+'\n'+clean(x.url));
 if(cmd==='/reviews')return head+'المسودات المعلقة: '+(d.pending??'غير متاح')+'\n'+list(d.drafts,x=>clean(x.title))+'\n'+(d.advanced?'اختر مراجعة المحتوى لعرض العناصر المؤهلة؛ الاعتماد مشروط بالتأكيد.':'المراجعة والاعتماد من لوحة التحكم فقط.');
 if(cmd==='/advice'){
 const recommendations=[];
 if(d.pending>0)recommendations.push('راجع المسودات المعلقة قبل زيادة إنتاج المحتوى.');
 if(d.radar?.status==='failed'||d.radar?.status==='partial')recommendations.push('راجع آخر دورة لرصد السوق قبل الاعتماد على نتائجها.');
 if(d.gsc?.status==='failed')recommendations.push('تحقق من مزامنة Search Console.');
 if(d.opportunities?.length)recommendations.push('راجع الفرصة ذات الأولوية: '+clean(d.opportunities[0].title));
 if(!recommendations.length)recommendations.push('لا توجد توصية مؤكدة من البيانات المتاحة.');
 return head+'توصيات مبنية على قواعد وبيانات فعلية (ليست قرارات آلية):\n'+recommendations.join('\n');
 }
 return head+'الأمر غير مدعوم.';
}
function chunks(text){
 const out=[];let rest=String(text);
 while(rest.length>3900){let cut=rest.lastIndexOf('\n',3900);if(cut<1)cut=3900;if(/[\uD800-\uDBFF]/.test(rest[cut-1]))cut--;out.push(rest.slice(0,cut));rest=rest.slice(cut).replace(/^\n/,'');}
 if(rest)out.push(rest);return out;
}

// Maintain the review-preview subscription only for the existing verified bot,
// owner and endpoint. Never replace an unconfigured or conflicting webhook.
async function reconcileReviewWebhook(cfg,username,api){
 const endpoint='https://free-llm-api-1-didl.onrender.com/api/telegram/operations';
 try{
  if(!cfg||!username)return 'configuration_incomplete';
  const info=await api('getWebhookInfo',{});
  if(info?.url!==endpoint)return 'webhook_conflict';
  if(!Array.isArray(info.allowed_updates)||!info.allowed_updates.every(x=>typeof x==='string'))return 'subscription_unverified';
  if(info.allowed_updates.includes('message')&&info.allowed_updates.includes('callback_query'))return 'verified';
  if(info.allowed_updates.length!==1||info.allowed_updates[0]!=='message'||info.has_custom_certificate!==false)return 'subscription_unverified';
  const me=await api('getMe',{});
  if(me?.is_bot!==true||String(me.username).toLowerCase()!==username.toLowerCase())return 'bot_identity_mismatch';
  const chat=await api('getChat',{chat_id:cfg.chat});
  if(chat?.type!=='private'||String(chat.id)!==cfg.owner||cfg.owner!==cfg.chat)return 'owner_chat_mismatch';
  const current=await api('getWebhookInfo',{});
  if(current?.url!==endpoint||current.has_custom_certificate!==false||!Array.isArray(current.allowed_updates)||current.allowed_updates.length!==1||current.allowed_updates[0]!=='message')return 'subscription_changed';
  const result=await api('setWebhook',{url:endpoint,secret_token:cfg.secret,allowed_updates:['message','callback_query'],drop_pending_updates:false,...(Number.isInteger(current.max_connections)&&current.max_connections>=1&&current.max_connections<=100?{max_connections:current.max_connections}:{})});
  if(result!==true)return 'subscription_unverified';
  const confirmed=await api('getWebhookInfo',{});
  return confirmed?.url===endpoint&&Array.isArray(confirmed.allowed_updates)&&confirmed.allowed_updates.includes('message')&&confirmed.allowed_updates.includes('callback_query')?'repaired_verified':'subscription_unverified';
 }catch{return 'subscription_unverified';}
}
module.exports={config,authentic,command,render,chunks,normalizeCommand,keyboard,reviewCallback,reconcileReviewWebhook};
