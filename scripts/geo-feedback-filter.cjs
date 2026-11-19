'use strict';
function norm(raw){return String(raw||'').normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ')}
function host(raw){try{return new URL(String(raw).includes('://')?raw:'https://'+raw).hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}}
/** Mirrors the server's exact reviewer-term / domain guard for model evidence. */
function applyFeedbackToEvidence(items,excluded){
 if(!Array.isArray(items)||!Array.isArray(excluded))return {items:[],excluded:0};
 const blockedKeywords=new Set(excluded.filter(r=>r&&r.subject_type==='keyword'&&typeof r.subject_key==='string')
   .map(r=>[norm(r.subject_key),r.language||null].join('|')));
 const blockedDomains=new Set(excluded.filter(r=>r&&r.subject_type==='competitor'&&typeof r.subject_key==='string')
   .map(r=>host(r.subject_key)));
 const result=items.filter(item=>{
  const type=item?.type;
  const name=norm(item?.name||item?.term||item?.keyword||'');
  const lang=item?.language||null;
  if(['keyword','keyword_suggestion'].includes(type)&&
     (blockedKeywords.has(name+'|'+lang)||blockedKeywords.has(name+'|')))return false;
  if(['competitor','competitor_candidate','observation'].includes(type)){
   const domain=host(item?.domain||item?.url||'');
   if(domain&&blockedDomains.has(domain))return false;
  }
  return true;
 });
 return {items:result,excluded:items.length-result.length};
}
module.exports={applyFeedbackToEvidence};
