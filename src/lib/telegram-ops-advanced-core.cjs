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
 m=s.match(/^\/(review|approve|reject)\s+([a-f0-9]{24})$/);
 if(m)return {kind:m[1],key:m[2]};
 m=s.match(/^\/confirm\s+([a-f0-9]{16})$/);
 if(m)return {kind:'confirm',code:m[1]};
 return null;
}
function fingerprint(kind,item){
 return createHash('sha256').update(JSON.stringify([kind,item])).digest('hex').slice(0,24);
}
function voiceSuggestion(text){
 if(typeof text!=='string'||text.length>1000)return null;
 const n=text.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[.!؟،。?]+$/g,'').replace(/\s+/g,' ').trim().toLowerCase();
 if(readonly.includes(n))return n;
 // Match the entire utterance against a bounded read-only grammar.
 // Never infer a mutation, strip arbitrary words or execute a transcript.
 const prefix=/^(?:(?:لو سمحت|من فضلك)\s+)?(?:(?:اعطني|اعطيني|عطني|عطيني|اعطنا|اعرض|اعرض لي|ورني|وريني|ارني|طلع لي|اطلع لي|جيب لي|ابغي|ابغى|ابي|ابغا|اريد|احتاج|ممكن|ودي اعرف|علمني|قل لي|وش|ايش|ما هي|ما هو|كيف)\s+)?/;
 const suffix=/\s+(?:لو سمحت|من فضلك|الان|الحين|اليوم|حاليا)$/;
 const target=n.replace(prefix,'').replace(suffix,'').trim();
 const groups={
 '/status':['حالة الانظمة','حالة النظام','وضع الانظمة','وضع النظام','صحة الانظمة','حالة التشغيل','الانظمة شغالة','الانظمة شغاله','الانظمة','كيف الانظمة'],
 '/brief':['التقرير اليومي','الاحاطة الادارية','التقرير الاداري','تقرير اليوم','ملخص اليوم','ملخص الانظمة'],
 '/market':['المنافسين','المنافسون','استخبارات السوق','رصد السوق','حالة السوق','الكلمات والمنافسين'],
 '/opportunities':['الفرص','الفرص والاهداف','فرص السوق','الفرص المتاحة','الاهداف'],
 '/published':['المحتوي المنشور','المحتوى المنشور','المنشورات','المحتوي المنشور اليوم','روابط النشر'],
 '/reviews':['المسودات المعلقة','المسودات'],
 '/reviewlist':['المراجعات','مراجعة المحتوي','مراجعة المحتوى','المحتوي قيد المراجعة'],
 '/advice':['التوصيات','توصيات المستشار','توصياتك','نصائحك'],
 '/memory':['الذاكرة','الذاكرة الاستراتيجية','القرارات المحفوظة'],
 '/commandcenter':['غرفة القيادة','غرفة العمليات','تقرير المنسق','تقرير غرفة القيادة'],
 '/help':['المساعدة','الاوامر','قائمة الاوامر']
 };
 for(const cmd of readonly)if(groups[cmd]?.includes(target))return cmd;
 return null;
}
function safeDecision(s){return typeof s==='string'&&s.length<=1000&&!/(?:\b(?:api[_ -]?key|token|password|secret)\s*[:=]|\b\d{6,}:[A-Za-z0-9_-]{20,}|\bsk-[A-Za-z0-9_-]{15,}|\bBearer\s+\S+)/i.test(s);}
module.exports={parse,fingerprint,voiceSuggestion,safeDecision};
