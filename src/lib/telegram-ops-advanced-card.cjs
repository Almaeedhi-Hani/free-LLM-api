'use strict';
const button=(text,callback_data)=>({text,callback_data});
const urlButton=(text,url)=>({text,url});
const dashboard='https://free-llm-api-1-didl.onrender.com/admin/dashboard';
function sourceButtons(refs){
 const result=[];
 for(const ref of refs||[]){
  if(result.length>=6)break;
  try{
   const url=new URL(ref.url);
   if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.href.length>1500)continue;
   result.push([urlButton('🔗 '+String(ref.label||url.hostname).slice(0,55),url.href)]);
  }catch{}
 }
 return result;
}
function card({key,title,kind,body,refs,eligible,index,total,previous,next,full,preflight}){
 const type=kind==='faq'?'سؤال شائع FAQ':'محتوى تحريري';
 const sources=sourceButtons(refs);
 const text='📋 طلب مراجعة محتوى — '+(index+1)+' من '+total+'\n\n'+title+'\n\nالنوع: '+type+'\nالحالة: بانتظار المراجعة\n\n'+(full?'المحتوى المقترح:\n'+body:'النص طويل؛ اقرأ المحتوى الكامل من لوحة الإدارة قبل اتخاذ أي قرار.')+'\n\nالأدلة المحفوظة: '+(refs||[]).length+ ' — وجود روابط لا يعني التحقق المستقل منها.\n'+(preflight?'آخر فحص: '+preflight.matched+' من '+preflight.total+' — '+(eligible?'مطابقة حرفية مكتملة؛ لا تثبت السياق القانوني وحدها.':'غير مؤهل بعد.')+'\n':'')+(eligible&&full?'يمكن طلب الاعتماد بعد قراءة النص والأدلة؛ يلزم تأكيد منفصل.':'الاعتماد غير متاح هنا؛ يلزم استكمال شروط المراجعة في لوحة الإدارة.');
 const rows=full&&text.length<=3500?[...sources]:[];
 if(full&&text.length<=3500){
  rows.push([...(eligible?[button('✅ طلب الاعتماد','approve:'+key)]:[]),button('❌ طلب الرفض','reject:'+key)]);
 }
 rows.push([button('🔍 التحقق من المصادر الرسمية','verify:'+key)]);
 rows.push([button('✏️ اقتراح تصحيح المحتوى','revise:'+key)]);
 rows.push([button('📋 أسباب منع الاعتماد','reasons:'+key)]);
 rows.push([urlButton('لوحة الإدارة — المصادر والتعديل',dashboard)]);
 const nav=[];
 if(previous)nav.push(button('⬅ السابق','review:'+previous));
 if(next)nav.push(button('التالي ➡','review:'+next));
 if(nav.length)rows.push(nav);
 rows.push([button('📋 قائمة المراجعات','reviewlist')]);
 return {text:text.length<=3500?text:'📋 طلب مراجعة محتوى\n\n'+title.slice(0,240)+'\nالنص طويل؛ افتح لوحة الإدارة للمراجعة الكاملة.',inline_keyboard:rows};
}
function decisionCard(text){
 const match=text.match(/\n\nللتأكيد الصريح خلال 10 دقائق: \/confirm ([a-f0-9]{16})\nعدم التأكيد يعني عدم التنفيذ\.$/);
 if(!match)return {text,inline_keyboard:[[button('📋 قائمة المراجعات','reviewlist')]]};
 return {text:text.slice(0,match.index)+'\n\n⚠️ تأكيد صريح خلال 10 دقائق. عدم التأكيد يعني عدم التنفيذ.',inline_keyboard:[[button('تأكيد القرار','confirm:'+match[1])],[button('العودة دون تنفيذ','reviewlist')]]};
}
module.exports={card,decisionCard,sourceButtons};
