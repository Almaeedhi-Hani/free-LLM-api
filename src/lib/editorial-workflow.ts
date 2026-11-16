import {topicNodeById,siteTopicPath} from './content-tree';
/** Multiple reviewed editorial publication surfaces. Never auto-publish AI output. */
import { type EditorialItem, type EditorialKind, type EditorialLocale, type EditorialStatus } from './editorial-types';
export type {EditorialItem,EditorialKind,EditorialLocale,EditorialStatus,EditorialRef} from './editorial-types';
export {officialSourceCandidates} from './official-source-candidates';
const kinds=new Set(['home','service','packages','guide','comparison','trust','technical_seo','internal_link']);
const services=new Set(['company-formation','misa-license','corporate-banking','contract-drafting','premium-residency','investment-funds']);
const languages=new Set(['ar','en','zh']);
const statuses=new Set(['pending','approved','rejected']);
const risks=new Set(['low','medium','high']);
const safeText=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[<>]/.test(v);
// Chinese ideographs carry substantially more meaning per character than English prose.
// These minima validate unpublished draft substance only; human review is still required.
const editorialMin=(lang:EditorialLocale,latin:number,chinese:number)=>lang==='zh'?chinese:latin;
/** Canonicalize known model-facing topic routes/IDs to existing service slugs.
 * Reject unknown routes downstream: never create a new service implicitly. */
export function canonicalServiceTarget(value:string):string {
 if(typeof value!=='string')return value;
 const raw=value.trim();
 const slug=raw.startsWith('/services/')?raw.slice('/services/'.length):raw;
 if(services.has(slug))return slug;
 const route=topicNodeById(slug)?.route;
 if(route?.startsWith('/services/')){
  const resolved=route.slice('/services/'.length);
  if(services.has(resolved))return resolved;
 }
 return raw;
}
export function safeSlug(slug:string):boolean{return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=90}
export function approvedEditorial(items:readonly EditorialItem[]|undefined,lang:EditorialLocale,kind?:EditorialKind,target?:string):EditorialItem[]{
 return (items||[]).filter(x=>x.status==='approved'&&x.reviewedAt&&x.lang===lang&&(!kind||x.kind===kind)&&(!target||x.target===target)&&x.verified_sources?.length);
}
/** Publication gate: reject planning instructions accidentally saved as visitor-facing copy.
 * Run only on new approvals; pending legacy proposals remain editable and preserved. */
export function editorialPublicationIssues(item:Pick<EditorialItem,'body'|'sections'|'kind'>):string[]{
 const parts=[item.body,...(item.sections||[]).flatMap(s=>[s.body,...(s.subsections||[]).map(h=>h.body)])];
 const patterns=[
  /\b(?:this|the) (?:service )?page should (?:explain|describe|include|cover|list|discuss)\b/i,
  /\b(?:this|the) (?:section|article|guide) should (?:explain|describe|include|cover|list|discuss)\b/i,
  /(?:^|[.!?]\s+)(?:describe|explain|list|include|add|write|mention|outline|provide a (?:general |brief )?(?:checklist|overview))\s+(?:the|a|an|how|what|tasks|steps|information|proposed|current|practical)\b/i,
  /\b(?:the H1 suggestion is for review|primary keyword is taken from the site tree|demand is unverified)\b/i
 ];
 const issues:string[]=[];
 if(parts.some(p=>patterns.some(rx=>rx.test(p))))issues.push('Draft contains writing instructions or internal SEO planning notes, not publishable visitor copy.');
 if(item.kind==='internal_link'||item.kind==='technical_seo')issues.push('SEO tasks must never be published as visitor content.');
 return issues;
}
export function validateEditorialItem(item:unknown):EditorialItem {
 if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid editorial item');
 const e={...(item as EditorialItem)};
 if(e.kind==='service')e.target=canonicalServiceTarget(e.target);
 if(e.related_service)e.related_service=canonicalServiceTarget(e.related_service);
 if(!safeText(e.id,8,128)||!kinds.has(e.kind)||!languages.has(e.lang)||!statuses.has(e.status)||!risks.has(e.risk_level))throw Error('Invalid editorial identity/type/language/status');
 if(!safeText(e.title,editorialMin(e.lang,12,6),170)||!safeText(e.summary,30,360)||!safeText(e.body,editorialMin(e.lang,100,80),10000))throw Error('Editorial content needs a substantive original title, summary and body');
 if(!Array.isArray(e.evidence_ids)||!Array.isArray(e.evidence_refs)||e.evidence_ids.length>12||e.evidence_refs.length>12)throw Error('Invalid editorial provenance');
 if(e.kind==='home'||e.kind==='trust'){if(e.target!=='/')throw Error('Invalid home target')}
 else if(e.kind==='packages'){if(e.target!=='/packages')throw Error('Invalid packages target')}
 else if(e.kind==='service'){if(!services.has(e.target))throw Error('Unknown service target')}
 else if(e.kind==='guide'||e.kind==='comparison'){
   if(!e.slug||!safeSlug(e.slug)||e.target!==e.slug)throw Error('Invalid guide slug');
   if(e.related_service && !services.has(e.related_service))throw Error('Invalid related service');
 }else if(e.kind==='technical_seo'||e.kind==='internal_link'){
   if(!/^\/(?:$|packages$|services\/(?:company-formation|misa-license|corporate-banking|contract-drafting|premium-residency|investment-funds)$|insights(?:\/[a-z0-9-]+)?$)/.test(e.target))throw Error('Invalid technical/internal link target');
 }
 if(e.topic_node_id){
   const node=topicNodeById(e.topic_node_id);
   if(!node)throw Error('Unknown topic node');
   if(e.kind==='service'&&node.route!=='/services/'+e.target)throw Error('Topic tree service target mismatch');
   if(e.kind==='packages'&&node.id!=='packages')throw Error('Topic tree package target mismatch');
   if((e.kind==='home'||e.kind==='trust')&&node.id!=='investor-hub')throw Error('Topic tree homepage mismatch');
 }
 if(e.primary_keyword&&!safeText(e.primary_keyword,3,160))throw Error('Invalid primary keyword');
 if(e.h1_suggestion&&!safeText(e.h1_suggestion,editorialMin(e.lang,12,6),170))throw Error('Invalid H1 suggestion');
 if(e.secondary_keywords&&(!Array.isArray(e.secondary_keywords)||e.secondary_keywords.length>10||!e.secondary_keywords.every(x=>safeText(x,3,150))))throw Error('Invalid supporting keywords');
 if(e.sections&&(!Array.isArray(e.sections)||e.sections.length>6||!e.sections.every(s=>safeText(s.h2,editorialMin(e.lang,6,4),170)&&safeText(s.body,editorialMin(e.lang,70,20),5000)&&(!s.subsections||(Array.isArray(s.subsections)&&s.subsections.length<=5&&s.subsections.every(h=>safeText(h.h3,editorialMin(e.lang,6,4),170)&&safeText(h.body,editorialMin(e.lang,60,20),4000)))))))throw Error('Invalid H2/H3 section structure');
 if(e.internal_links&&(!Array.isArray(e.internal_links)||e.internal_links.length>6||!e.internal_links.every(x=>safeText(x.node_id,2,90)&&safeText(x.anchor,editorialMin(e.lang,5,3),120)&&Boolean(siteTopicPath(x.node_id)))))throw Error('Internal links must point to existing live tree pages');
 if(e.schema_suggestions&&(!Array.isArray(e.schema_suggestions)||e.schema_suggestions.length>5||!e.schema_suggestions.every(s=>['Article','BreadcrumbList','Service','WebPage','FAQPage','CollectionPage'].includes(s))))throw Error('Invalid Schema suggestion');
 if(!Number.isFinite(Date.parse(e.createdAt)))throw Error('Invalid editorial creation date');
 if(e.status==='approved'){
   const publicationIssues=editorialPublicationIssues(e);
   if(publicationIssues.length)throw Error('Editorial publication blocked: '+publicationIssues.join(' '));
   if(!e.reviewedAt||!Number.isFinite(Date.parse(e.reviewedAt)))throw Error('Editorial approval must have reviewedAt');
   if(e.kind==='technical_seo'||e.kind==='internal_link')throw Error('Technical SEO and links are implementation tasks, never published by content store');
   if(!Array.isArray(e.verified_sources)||e.verified_sources.length===0||e.verified_sources.length>12)throw Error('Approval needs reviewed source links');
   for(const v of e.verified_sources){try{const u=new URL(v);if(u.protocol!=='https:'||!u.hostname||u.username||u.password)throw Error('Bad URL')}catch{throw Error('Reviewed sources require HTTPS URLs')}}
 }
 return e;
}
export function validateEditorialBatch(items:unknown):EditorialItem[]{
 if(!Array.isArray(items)||items.length>50)throw Error('Invalid editorial batch');
 const ids=new Set<string>();
 return items.map(item=>{const valid=validateEditorialItem(item);if(ids.has(valid.id))throw Error('Duplicate editorial ID');ids.add(valid.id);return valid});
}
export function publicGuide(items:readonly EditorialItem[]|undefined,lang:EditorialLocale,slug:string):EditorialItem|undefined{
 return approvedEditorial(items,lang).find(e=>(e.kind==='guide'||e.kind==='comparison')&&e.slug===slug);
}
