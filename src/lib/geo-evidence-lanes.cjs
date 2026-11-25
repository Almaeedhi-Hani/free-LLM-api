'use strict';
// Evidence routing is not risk authorization. Mixed and unknown claims stay
// fail-closed; no model-supplied category or negative keyword test grants safety.
const commercial=/(professional (?:service )?fees?|package (?:fees?|prices?|pricing|scope|exclusions?)|service (?:scope|deliverables)|written (?:scope|proposal)|compare (?:service |support )?providers|our (?:service|package|fees|scope)|أتعاب|نطاق (?:الخدمة|الباقة|الباقات)|أسعار الباقات|مقارنة (?:الباقات|مقدمي الخدمات)|套餐|专业服务费|服务范围|服务报价|第三方支出)/iu;
const officialTopic=/(licen[sc]|regulat|statutory|government|official (?:fees?|requirements?|approval|registration)|tax|ownership|shareholder|bank|residen|immigrat|visa|permit|approval|guarantee|penalt|company formation|company registration|investment registration|ترخيص|رخصة|نظام|قانون|رسوم (?:حكومية|رسمية)|ضريب|ملكية|إقامة|تأشيرة|بنك|مصرف|تأسيس (?:الشرك|شرك)|许可|执照|法律|税|银行|居留|签证|股东|监管|审批|公司注册|设立公司|投资登记|政府规费)/iu;
const instruction=/(homepage should|(?:the )?\/packages page should|(?:page|section|homepage) should (?:show|act|include|display|make|add|link)|(?:editorial|writing|implementation) (?:notes?|instructions?|plans?)|preserve the (?:published|existing|current).{0,60}(?:layout|design)|should not change the published|before publication|ملاحظات تحريرية|تعليمات (?:الكتابة|التطوير|الوكيل)|مقترح تحريري|ترتيبها البصري|العنوان الحالي|قبل النشر|编辑计划|内部指令|写作指令|发布前.{0,12}(?:审核|审查)|不改变.{0,12}(?:页面|布局|套餐))/iu;
function classify(kind,item,fields,planning=false){
 if(!item||!Array.isArray(fields)||!fields.every(s=>typeof s==='string'))return 'unknown';
 if(kind==='editorial'&&(['technical_seo','internal_link'].includes(item.kind)||planning))return 'implementation';
 const text=[item.q,item.title,...fields].filter(Boolean).join(' ').normalize('NFKC');
 if(instruction.test(text))return 'implementation';
 const c=commercial.test(text)||kind==='editorial'&&item.kind==='packages';
 const o=officialTopic.test(text);
 if(c&&o)return 'mixed';
 if(c)return 'commercial';
 if(o)return 'regulatory';
 return 'unknown';
}
const VERSION='evidence-lanes-v1';
module.exports={classify,VERSION};
