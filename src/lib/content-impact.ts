import type {ContentFAQ,ContentDraft} from './content-store';
import type {EditorialItem,EditorialLocale} from './editorial-types';

export type ImpactStatus='published'|'pending'|'rejected'|'approved_unlinked';
export type ImpactCategory='page'|'faq'|'task';
export type ImpactSource='geo_editorial'|'geo_draft'|'manual_or_legacy';
export interface ImpactItem {
 id:string; kind:string; category:ImpactCategory; lang:EditorialLocale|'und';
 title:string; summary:string; body:string; status:ImpactStatus;
 origin:ImpactSource; createdAt:string|null; updatedAt:string|null;
 targetPath:string|null; risk:'low'|'medium'|'high'|null;
 sourceIds:string[]; verifiedSources:string[];
 sections:EditorialItem['sections']; primaryKeyword:string|null;
 itemId:string|null; draftIndex:number|null; faqIndex:number|null;
}
export type ImpactStats={clicks:number;impressions:number;ctr:number|null;position:number|null;observedDays:number;capturedAt:string|null};
export type ImpactMeasurement={source:'gsc_daily_page';days:7|28|90;status:'available'|'no_page_rows'|'unavailable';pages:Record<string,ImpactStats>;message:string};

const localePrefix=(lang:EditorialLocale)=>lang==='ar'?'':'/'+lang;
export function editorialPath(item:EditorialItem):string|null {
 const prefix=localePrefix(item.lang);
 if(item.kind==='home'||item.kind==='trust')return prefix+'/';
 if(item.kind==='packages')return prefix+'/packages';
 if(item.kind==='service'&&/^(company-formation|misa-license|corporate-banking|contract-drafting|premium-residency|investment-funds)$/.test(item.target))
  return prefix+'/services/'+item.target;
 if((item.kind==='guide'||item.kind==='comparison')&&item.slug&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug))
  return prefix+'/insights/'+item.slug;
 return null;
}
function normalizedQuestion(q:string):string{return q.trim().toLocaleLowerCase()}
function exactDraft(faq:ContentFAQ,drafts:readonly ContentDraft[]):{draft:ContentDraft,index:number}|null {
 const idx=drafts.findIndex(d=>d.status==='approved'&&normalizedQuestion(d.q)===normalizedQuestion(faq.q)&&d.a.trim()===faq.a.trim());
 return idx<0?null:{draft:drafts[idx],index:idx};
}
/** Inventory uses the existing persisted site content; no assumptions about analytics or author attribution. */
export function buildImpactInventory(editorial:readonly EditorialItem[],faqs:readonly ContentFAQ[],drafts:readonly ContentDraft[]):ImpactItem[]{
 const rows:ImpactItem[]=editorial.map((e):ImpactItem=>({
   id:'editorial:'+e.id,kind:e.kind,category:e.kind==='technical_seo'||e.kind==='internal_link'?'task':'page',
   lang:e.lang,title:e.title,summary:e.summary,body:e.body,
   status:e.status==='approved'?'published':e.status,
   origin:'geo_editorial',createdAt:e.createdAt||null,updatedAt:e.updatedAt||e.reviewedAt||null,
   targetPath:editorialPath(e),risk:e.risk_level,sourceIds:e.evidence_ids||[],verifiedSources:e.verified_sources||[],
   sections:e.sections||[],primaryKeyword:e.primary_keyword||null,itemId:e.id,draftIndex:null,faqIndex:null
 }));
 const matchedDrafts=new Set<number>();
 faqs.forEach((f,index)=>{
   const match=exactDraft(f,drafts);
   if(match)matchedDrafts.add(match.index);
   rows.push({id:'faq:'+index,kind:'faq',category:'faq',lang:'und',title:f.q,summary:f.a.slice(0,160),body:f.a,
     status:'published',origin:match?'geo_draft':'manual_or_legacy',
     createdAt:match?.draft.createdAt||null,updatedAt:null,targetPath:'/',risk:match?.draft.risk_level||null,
     sourceIds:match?.draft.evidence_ids||[],verifiedSources:[],sections:[],primaryKeyword:null,
     itemId:null,draftIndex:match?.index??null,faqIndex:index});
 });
 drafts.forEach((d,index)=>{
   if(matchedDrafts.has(index))return;
   rows.push({id:'draft:'+index,kind:'faq_draft',category:'faq',lang:'und',title:d.q,summary:d.a.slice(0,160),body:d.a,
    status:d.status==='approved'?'approved_unlinked':d.status,
    origin:'geo_draft',createdAt:d.createdAt||null,updatedAt:null,targetPath:null,
    risk:d.risk_level||null,sourceIds:d.evidence_ids||[],verifiedSources:[],
    sections:[],primaryKeyword:null,itemId:null,draftIndex:index,faqIndex:null});
 });
 return rows;
}
/** Future autopublication decisions are intentionally fail-closed.
 * The scheduled GEO runner and admin APIs do not invoke this function yet.
 * High-risk legal/investment/fee copy must retain specialist review. */
export type PublicationPolicy={mode:'manual'|'guarded_automatic';enabled:boolean;maxDailyPages:number;allowHighRisk?:boolean};
export function autoPublicationEligibility(item:ImpactItem,policy:PublicationPolicy,context:{
  hasVersionedRollback:boolean;hasIdempotencyKey:boolean;officialSourcesIndependentlyChecked:boolean;
  highRiskClaimsVerified?:boolean;
}):{eligible:boolean;reasons:string[]}{
 const reasons:string[]=[];
 if(!policy.enabled||policy.mode!=='guarded_automatic')reasons.push('Automatic publication is disabled');
 if(!Number.isSafeInteger(policy.maxDailyPages)||policy.maxDailyPages<1||policy.maxDailyPages>10)reasons.push('Invalid bounded daily quota');
 if(item.status!=='pending'||item.category!=='page'||!item.targetPath)reasons.push('No eligible pending page target');
 if(item.risk!=='low'){
  if(item.risk!=='high'&&item.risk!=='medium')reasons.push('Unclassified risk requires review');
  else if(!policy.allowHighRisk)reasons.push('Sensitive automatic publication requires separate opt-in');
  else if(!context.highRiskClaimsVerified)reasons.push('High-risk claims require live official quote verification');
 }
 if(!item.sourceIds.length||!item.verifiedSources.length||!context.officialSourcesIndependentlyChecked)reasons.push('Independently checked official sources required');
 if(!context.hasIdempotencyKey||!context.hasVersionedRollback)reasons.push('Idempotency and rollback required');
 return {eligible:reasons.length===0,reasons};
}
