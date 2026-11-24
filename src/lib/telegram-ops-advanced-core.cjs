'use strict';
const {createHash}=require('node:crypto');
const readonly=['/status','/brief','/market','/opportunities','/published','/reviews','/advice','/memory','/reviewlist','/help'];
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
 const n=String(text||'').trim().replace(/[.!؟،。]+$/g,'').replace(/[أإآ]/g,'ا').replace(/\s+/g,' ').toLowerCase();
 if(readonly.includes(n))return n;
 const map={'حالة الانظمة':'/status','حالة النظام':'/status','اعرض حالة الانظمة':'/status','التقرير اليومي':'/brief','الاحاطة الادارية':'/brief','المنافسين':'/market','المنافسون':'/market','الفرص':'/opportunities','الفرص والاهداف':'/opportunities','المحتوى المنشور':'/published','المراجعات':'/reviewlist','التوصيات':'/advice','الذاكرة':'/memory'};
 return map[n]||null;
}
function safeDecision(s){return typeof s==='string'&&s.length<=1000&&!/(?:\b(?:api[_ -]?key|token|password|secret)\s*[:=]|\b\d{6,}:[A-Za-z0-9_-]{20,}|\bsk-[A-Za-z0-9_-]{15,}|\bBearer\s+\S+)/i.test(s);}
module.exports={parse,fingerprint,voiceSuggestion,safeDecision};
