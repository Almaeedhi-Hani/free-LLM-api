'use strict';
const {createHash}=require('node:crypto');
const readonly=['/status','/brief','/market','/opportunities','/published','/reviews','/advice','/memory','/reviewlist','/help','/commandcenter'];
function parse(text){
 if(typeof text!=='string')return null;
 const s=text.trim();
 if(s==='/memory'||s==='/reviewlist')return {kind:s.slice(1)};
 let m=s.match(/^\/remember\s+([\s\S]{1,1000})$/);
 if(m&&m[1].trim())return {kind:'remember',decision:m[1].trim()};
 m=s.match(/^\/forget\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
 if(m)return {kind:'forget',id:m[1].toLowerCase()};
 m=s.match(/^\/(review|approve|reject|verify|revise|reasons)\s+([a-f0-9]{24})$/);
 if(m)return {kind:m[1],key:m[2]};
 m=s.match(/^\/confirm\s+([a-f0-9]{16})$/);
 if(m)return {kind:'confirm',code:m[1]};
 return null;
}
function fingerprint(kind,item){
 return createHash('sha256').update(JSON.stringify([kind,item])).digest('hex').slice(0,24);
}
// Conservative spelling recovery: only full multiword Arabic phrases with
// exactly one altered word and at least one unchanged anchor. Never execute.
function editDistance(a,b){
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const next=[i];
  for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));
  row=next;
 }
 return row[b.length];
}
function boundedVoiceMatch(target,groups){
 if(target.length>80||!/^[\u0621-\u063A\u0641-\u064A ]+$/.test(target))return null;
 const words=target.split(' ');
 if(words.length<2||words.length>4||words.some(w=>w.length>20))return null;
 if(words.some(w=>/^(?:لا|لن|لم|ليس|بدون|ثم|احذف|حذف|انشر|نشر|اعتمد|وافق|ارفض|الغ|الغي|غير|عدل|اوقف|شغل|نفذ|امسح|انس|احفظ|اكتب|ارسل|حدث)$/.test(w)))return null;
 const matches=new Set();
 for(const cmd of readonly)for(const phrase of groups[cmd]||[]){
  const expected=phrase.split(' ');
  if(expected.length!==words.length)continue;
  const mismatches=words.map((w,i)=>w===expected[i]?-1:i).filter(i=>i>=0);
  if(mismatches.length!==1)continue;
  const i=mismatches[0],a=words[i],b=expected[i];
  if(a.length<4||b.length<5||!words.some((w,j)=>j!==i&&w===expected[j]&&w.length>=4))continue;
  const distance=editDistance(a,b);
  // Two edits only for longer words, with a substantial shared suffix or prefix.
  const edge=(a.slice(-3)===b.slice(-3)||a.slice(0,3)===b.slice(0,3));
  if(distance===1||(distance===2&&b.length>=7&&a.length>=5&&edge))matches.add(cmd);
 }
 return matches.size===1?[...matches][0]:null;
}
function voiceSuggestion(text){
 if(typeof text!=='string'||text.length>1000)return null;
 const n=text.trim().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[.!؟،。?]+$/g,'').replace(/\s+/g,' ').trim().toLowerCase();
 if(readonly.includes(n))return n;
 // Match the entire utterance against a bounded read-only grammar.
 // Never infer a mutation, strip arbitrary words or execute a transcript.
 // Exact aliases take priority; bounded spelling recovery only suggests read commands.
 const prefix=/^(?:(?:لو سمحت|من فضلك)\s+)?(?:(?:اعطني|اعطيني|عطني|عطيني|اعطنا|اعرض لي|اعرض|ورني|وريني|ارني|طلع لي|اطلع لي|جيب لي|ابغي|ابغى|ابي|ابغا|اريد|احتاج|ممكن|ودي اعرف|علمني|قل لي|وش|ايش|ما هي|ما هو|كيف)\s+)?/;
 const suffix=/\s+(?:لو سمحت|من فضلك|الان|الحين|اليوم|حاليا)$/;
 const target=n.replace(prefix,'').replace(suffix,'').trim();
 const groups={
 '/status':['حالة الانظمة','حالة النظام','وضع الانظمة','وضع النظام','صحة الانظمة','حالة التشغيل','الانظمة شغالة','الانظمة شغاله','الانظمة','كيف الانظمة'],
 '/brief':['التقرير اليومي','الاحاطة الادارية','التقرير الاداري','التقرير الادارة','تقرير الادارة','التقرير الاداري اليوم','تقرير اليوم','ملخص اليوم','ملخص الانظمة'],
 '/market':['المنافسين','المنافسون','استخبارات السوق','رصد السوق','حالة السوق','الكلمات والمنافسين'],
 '/opportunities':['الفرص','الفرص والاهداف','الفرس والاهداف','فرص السوق','الفرص المتاحة','الاهداف'],
 '/published':['المحتوي المنشور','المحتوى المنشور','المنشورات','المحتوي المنشور اليوم','روابط النشر'],
 '/reviews':['المسودات المعلقة','المسودات'],
 '/reviewlist':['المراجعات','مراجعة المحتوي','مراجعة المحتوى','المحتوي قيد المراجعة'],
 '/advice':['التوصيات','توصيات المستشار','توصياتك','نصائحك'],
 '/memory':['الذاكرة','الذاكرة الاستراتيجية','القرارات المحفوظة'],
 '/commandcenter':['غرفة القيادة','غرفة العمليات','تقرير المنسق','تقرير غرفة القيادة'],
 '/help':['المساعدة','الاوامر','قائمة الاوامر']
 };
 for(const cmd of readonly)if(groups[cmd]?.includes(target))return cmd;
 return boundedVoiceMatch(target,groups);
}
function safeDecision(s){return typeof s==='string'&&s.length<=1000&&!/(?:\b(?:api[_ -]?key|token|password|secret)\s*[:=]|\b\d{6,}:[A-Za-z0-9_-]{20,}|\bsk-[A-Za-z0-9_-]{15,}|\bBearer\s+\S+)/i.test(s);}
module.exports={parse,fingerprint,voiceSuggestion,safeDecision};
