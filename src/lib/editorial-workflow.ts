/** Multiple reviewed editorial publication surfaces. Never auto-publish AI output. */
export type EditorialKind = 'home'|'service'|'packages'|'guide'|'comparison'|'trust'|'technical_seo'|'internal_link';
export type EditorialLocale = 'ar'|'en'|'zh';
export type EditorialStatus = 'pending'|'approved'|'rejected';
export type EditorialRef={id:string;label:string;source:string;kind:string;url?:string;observed_at?:string};
export type EditorialItem={
 id:string;kind:EditorialKind;lang:EditorialLocale;target:string;slug?:string;
 title:string;summary:string;body:string;risk_level:'low'|'medium'|'high';
 status:EditorialStatus;createdAt:string;reviewedAt?:string;updatedAt?:string;
 evidence_ids:string[];evidence_refs:EditorialRef[];verified_sources?:string[];
};
const kinds=new Set(['home','service','packages','guide','comparison','trust','technical_seo','internal_link']);
const services=new Set(['company-formation','misa-license','corporate-banking','contract-drafting','premium-residency','investment-funds']);
const languages=new Set(['ar','en','zh']);
const statuses=new Set(['pending','approved','rejected']);
const risks=new Set(['low','medium','high']);
const safeText=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[<>]/.test(v);
export function safeSlug(slug:string):boolean{return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=90}
export function approvedEditorial(items:readonly EditorialItem[]|undefined,lang:EditorialLocale,kind?:EditorialKind,target?:string):EditorialItem[]{
 return (items||[]).filter(x=>x.status==='approved'&&x.reviewedAt&&x.lang===lang&&(!kind||x.kind===kind)&&(!target||x.target===target)&&x.verified_sources?.length);
}
export function validateEditorialItem(item:unknown):EditorialItem {
 if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid editorial item');
 const e=item as EditorialItem;
 if(!safeText(e.id,8,128)||!kinds.has(e.kind)||!languages.has(e.lang)||!statuses.has(e.status)||!risks.has(e.risk_level))throw Error('Invalid editorial identity/type/language/status');
 if(!safeText(e.title,12,170)||!safeText(e.summary,30,360)||!safeText(e.body,100,10000))throw Error('Editorial content needs a substantive original title, summary and body');
 if(!Array.isArray(e.evidence_ids)||!Array.isArray(e.evidence_refs)||e.evidence_ids.length>12||e.evidence_refs.length>12)throw Error('Invalid editorial provenance');
 if(e.kind==='home'||e.kind==='trust'){if(e.target!=='/')throw Error('Invalid home target')}
 else if(e.kind==='packages'){if(e.target!=='/packages')throw Error('Invalid packages target')}
 else if(e.kind==='service'){if(!services.has(e.target))throw Error('Unknown service target')}
 else if(e.kind==='guide'||e.kind==='comparison'){
   if(!e.slug||!safeSlug(e.slug)||e.target!==e.slug)throw Error('Invalid guide slug');
 }else if(e.kind==='technical_seo'||e.kind==='internal_link'){
   if(!/^\/(?:$|packages$|services\/(?:company-formation|misa-license|corporate-banking|contract-drafting|premium-residency|investment-funds)$|insights(?:\/[a-z0-9-]+)?$)/.test(e.target))throw Error('Invalid technical/internal link target');
 }
 if(!Number.isFinite(Date.parse(e.createdAt)))throw Error('Invalid editorial creation date');
 if(e.status==='approved'){
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
