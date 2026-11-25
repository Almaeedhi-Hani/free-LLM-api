import type {EditorialItem} from './editorial-types';
import type {ContentFAQ} from './content-store';
export type ReviewTarget={kind:'editorial';id:string}|{kind:'faq';question:string};
export type AdminReview={key:string;version:string;reviewedAt:string};
export type ReviewMarks=readonly AdminReview[];
// Exact canonical visitor-copy comparison, not a publication permission.
// JSONB can reorder object fields, so compare recursively sorted fields.
function canonical(v:unknown):unknown{
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)]));
 return v;
}
export function editorialReviewIdentity(item:EditorialItem){
 return {key:'editorial:'+item.id,version:JSON.stringify(canonical([item.status,item.lang,item.kind,item.target,item.slug||'',item.title,item.summary,item.body,item.sections||[],item.internal_links||[],item.verified_sources||[],item.cited_sources||[],item.reviewedAt||'']))};
}
export function faqReviewIdentity(faq:ContentFAQ){
 return {key:'faq:'+faq.q,version:JSON.stringify([faq.q,faq.a])};
}
export function wasReviewed(marks:ReviewMarks|undefined,identity:{key:string;version:string}):boolean{
 return Array.isArray(marks)&&marks.some(m=>m.key===identity.key&&m.version===identity.version);
}
export function recordReview(marks:ReviewMarks|undefined,identity:{key:string;version:string},reviewedAt:string):AdminReview[]{
 return [...(Array.isArray(marks)?marks:[]).filter(m=>m.key!==identity.key),{...identity,reviewedAt}];
}
