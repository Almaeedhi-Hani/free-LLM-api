'use strict';
/**
 * Narrow boundary between LLM proposals and the existing GEO persistence API.
 * Do not manufacture a title, evidence, activity, official source, route or copy.
 * Unspecified goal priority is conservatively marked medium (queue default),
 * never claimed to have been assigned by the model.
 * Unsupported editorial page kinds/targets must be rejected, not guessed.
 */
const tree=require('../src/data/content-tree.json');
const knownNodes=new Map(tree.nodes.map(n=>[n.id,n]));
const EDITORIAL_KINDS=Object.freeze(['home','service','packages','guide','comparison','trust','technical_seo','internal_link']);
const validKinds=new Set(EDITORIAL_KINDS);
// Identical validator limits are exported to the direct provider contract;
// never lower them or relabel rejected content to make a cycle appear green.
const EDITORIAL_TEXT_MINIMA=Object.freeze({
 title:Object.freeze({ar:12,en:12,zh:6}),summary:30,
 body:Object.freeze({ar:100,en:100,zh:80})
});
const TECHNICAL_TARGET_RE=/^\/(?:$|packages$|services\/(?:company-formation|misa-license|corporate-banking|contract-drafting|premium-residency|investment-funds)$|insights(?:\/[a-z0-9-]+)?$)/;
const isValidTechnicalTarget=target=>typeof target==='string'&&TECHNICAL_TARGET_RE.test(target);
const validPriority=new Set(['high','medium','low']);
const safeText=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[<>]/.test(v);
function prepareGoals(items){
 const accepted=[],rejected=[];
 let defaulted=0;
 for(const [index,g] of (Array.isArray(items)?items:[]).entries()){
  if(!g||typeof g!=='object'||Array.isArray(g)||!safeText(g.title,3,500)){
   rejected.push({index,reason:'invalid_title'});continue;
  }
  const priority=validPriority.has(g.priority)?g.priority:'medium';
  if(priority!==g.priority)defaulted++;
  const item={title:g.title.trim(),priority};
  if(safeText(g.description,1,1000))item.description=g.description.trim();
  if(safeText(g.related_opportunity,1,500))item.related_opportunity=g.related_opportunity.trim();
  accepted.push(item);
 }
 return {accepted,rejected,defaulted};
}
function eligibleEditorial(item){
 if(!item||typeof item!=='object'||Array.isArray(item))return 'invalid_item';
 if(!validKinds.has(item.kind))return 'unknown_kind';
 if(!['ar','en','zh'].includes(item.lang))return 'invalid_language';
 const node=item.topic_node_id?knownNodes.get(item.topic_node_id):null;
 if(item.topic_node_id&&!node)return 'unknown_topic_node';
 const target=item.target;
 if(typeof target!=='string')return 'missing_target';
 if(item.kind==='home'||item.kind==='trust'){
  if(target!=='/'||node&&node.id!=='investor-hub')return 'wrong_home_target';
 }else if(item.kind==='packages'){
  if(target!=='/packages'||node&&node.id!=='packages')return 'wrong_package_target';
 }else if(item.kind==='service'){
  const slug=target.replace(/^\/services\//,'');
  if(!tree.nodes.some(n=>n.route==='/services/'+slug))return 'unknown_service_target';
  if(node&&node.route!=='/services/'+slug)return 'wrong_service_node';
 }else if(item.kind==='guide'||item.kind==='comparison'){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target)||target!==item.slug||target.length>90)
   return 'invalid_guide_slug';
 }else if(!isValidTechnicalTarget(target)){
  return 'invalid_technical_target';
 }
 if(!safeText(item.title,EDITORIAL_TEXT_MINIMA.title[item.lang],170)||
    !safeText(item.summary,EDITORIAL_TEXT_MINIMA.summary,360)||
    !safeText(item.body,EDITORIAL_TEXT_MINIMA.body[item.lang],10000))return 'insufficient_text';
 if(!['technical_seo','internal_link'].includes(item.kind)){
  const sections=Array.isArray(item.sections)?item.sections:[];
  const parts=[item.title,item.summary,item.body,...sections.flatMap(s=>s&&typeof s==='object'?[s.h2,s.body,...(Array.isArray(s.subsections)?s.subsections:[]).flatMap(h=>h&&typeof h==='object'?[h.h3,h.body]:[])]:[]),...(Array.isArray(item.internal_links)?item.internal_links:[]).map(l=>l?.anchor)];
  const patterns=[
  /مقترح تحريري|مراجعة تحريرية قبل النشر|خاضع[ة]? للمراجعة التحريرية|قبل النشر|العنوان الحالي|ترتيبها البصري|دون تغيير العرض الحالي|يقترح هذا القسم|يمكن تنظيم المعلومات على الصفحة|ويفضل عرض هذه العناصر|ويُفضل عرض هذه العناصر|سياسة داخلية|تعليمات الوكيل|المسارات المنشورة فعليًا/u,
  /编辑提案|内容提案|发布前.{0,12}(?:审核|审查)|保留.{0,12}(?:标题|布局|设计)|不改变.{0,12}(?:页面|布局|套餐)|首页决策支持模块|服务页强化|内部指令|主关键词|建议.{0,10}(?:页面|模块).{0,10}(?:展示|添加)/u,
  /\b(?:editorial proposal|content proposal|editorial review before publication|retain the current (?:title|layout|design)|without changing the (?:current |existing )?(?:layout|design|page title)|decision-support (?:block|section) for the (?:live |homepage)|fee-and-scope explanation section for the live|internal instructions)\b/i,
  /\b(?:the|this) (?:home\s?page|service page|page|guide|article|section|package (?:page|content)|insights hub) should \b/i,
  /\bpackage (?:content|page) should\b/i,
  /\b(?:this is (?:a )?(?:content|navigation) proposal|the primary keyword (?:comes|is inferred)|this is (?:a )?technical SEO task)\b/i,
  /\b(?:this|the) (?:service )?page should (?:explain|describe|include|cover|list|discuss)\b/i,
  /\b(?:this|the) (?:section|article|guide) should (?:explain|describe|include|cover|list|discuss)\b/i,
  /(?:^|[.!?]\s+)(?:describe|explain|list|include|add|write|mention|outline|provide a (?:general |brief )?(?:checklist|overview))\s+(?:the|a|an|how|what|tasks|steps|information|proposed|current|practical)\b/i,
  /\b(?:the H1 suggestion is for review|primary keyword is taken from the site tree|demand is unverified)\b/i
  ];
  if(parts.some(p=>typeof p==='string'&&patterns.some(rx=>rx.test(p))))return 'requires_finished_visitor_copy';
 }
 return null;
}
// Canonicalize only an explicitly supplied, unambiguous guide route. The
// duplicate target/slug fields describe the same path; never invent a slug,
// transliterate copy, rewrite a conflicting pair or accept an arbitrary URL.
function canonicalGuideFields(item){
 if(!item||typeof item!=='object'||!['guide','comparison'].includes(item.kind))return item;
 const missing=v=>v===undefined||v===null||v==='';
 const read=v=>{
  if(typeof v!=='string')return null;
  const slug=v.replace(/^\/insights\//,'');
  return slug.length<=90&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)?slug:null;
 };
 const a=read(item.target),b=read(item.slug);
 if((!a&&!missing(item.target))||(!b&&!missing(item.slug))||(a&&b&&a!==b)||(!a&&!b))return item;
 const slug=a||b;
 return {...item,target:slug,slug};
}
function screenEditorial(items,lang){
 const accepted=[],rejected=[];
 for(const [index,raw] of (Array.isArray(items)?items:[]).entries()){
  const item=canonicalGuideFields(raw);
  const reason=eligibleEditorial(item)||(lang&&item.lang!==lang?'wrong_locale':null);
  if(reason){rejected.push({index,reason});continue}
  // Conservative risk metadata; no lower-risk default, no automatic approval.
  accepted.push({...item,risk_level:['low','medium','high'].includes(item.risk_level)?item.risk_level:'high'});
 }
 return {accepted,rejected};
}
// Conservative local preflight mirrors the server's unchanged
// src/lib/geo-draft-quality.ts. The authenticated server is authoritative.
// Reject here *before* persistence so the existing one-repair allowance can
// target real copy-quality errors without replaying ambiguous database writes.
const DRAFT_GENERIC=[
 /observed competitor guides/i,
 /observed competitor pages/i,
 /competitors observed/i,
 /this is commercial advisory information/i,
 /commercial advisory information, not a government service/i,
 /تشير صفحات\s+competitors/i,
 /requirements, approvals, fees and timelines are determined by official/i
];
function draftLetterCounts(value){
 const ar=(value.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g)||[]).length;
 const zh=(value.match(/[\u3400-\u9FFF]/g)||[]).length;
 const en=(value.match(/[A-Za-z]/g)||[]).length;
 const total=ar+zh+en;
 return {ar,zh,en,total,arRatio:total?ar/total:0,zhRatio:total?zh/total:0,enRatio:total?en/total:0};
}
function draftQualityReason(q,a){
 const question=String(q||'').trim(),answer=String(a||'').trim();
 const ques=draftLetterCounts(question),res=draftLetterCounts(answer);
 const locale=ques.zh>=2?'zh':ques.ar>=2?'ar':'en';
 if(question.length<15||ques.total<8)return 'question_too_short';
 if(answer.length<90||res.total<55)return 'answer_too_short';
 if(question.includes('\uFFFD')||answer.includes('\uFFFD'))return 'replacement_character';
 if(locale==='ar'){
  if(ques.arRatio<0.65)return 'question_mixed_language';
  if(res.ar<45||res.arRatio<0.72)return 'answer_mixed_language';
 }else if(locale==='zh'){
  if(ques.zhRatio<0.55)return 'question_mixed_language';
  if(res.zh<35||res.zhRatio<0.48)return 'answer_mixed_language';
 }else{
  if(ques.enRatio<0.85)return 'question_mixed_language';
  if(res.en<50||res.enRatio<0.85)return 'answer_mixed_language';
 }
 if(DRAFT_GENERIC.some(re=>re.test(answer)))return 'generic_competitor_filler';
 if(/(?:guaranteed approval|\b100%\s+(?:approval|license)|مضمون\s+100%)/i.test(answer))
  return 'unverified_guarantee';
 return null;
}
function screenDrafts(items){
 const accepted=[],rejected=[],seenAnswers=new Set();
 const validText=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!value.includes('\uFFFD');
 for(const [index,item] of (Array.isArray(items)?items:[]).entries()){
  let reason;
  if(!item||typeof item!=='object'||Array.isArray(item))reason='invalid_item';
  else if(!validText(item.q||item.question,1000))reason='invalid_question';
  else if(!validText(item.a||item.answer,5000))reason='invalid_answer';
  const q=item?.q||item?.question,a=item?.a||item?.answer;
  if(!reason)reason=draftQualityReason(q,a);
  const answerKey=reason?null:a.trim().toLocaleLowerCase().replace(/\s+/g,' ');
  if(!reason&&seenAnswers.has(answerKey))reason='duplicate_answer';
  if(reason){rejected.push({index,reason});continue}
  seenAnswers.add(answerKey);
  accepted.push({...item,q,a});
 }
 return {accepted,rejected};
}
module.exports={prepareGoals,screenEditorial,eligibleEditorial,screenDrafts,draftQualityReason,EDITORIAL_KINDS,EDITORIAL_TEXT_MINIMA,isValidTechnicalTarget};
