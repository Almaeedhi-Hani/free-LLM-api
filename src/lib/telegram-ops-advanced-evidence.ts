import {createHash} from 'node:crypto';
import {getContent,setContent,type ContentDraft,type SiteContent} from './content-store';
import type {EditorialItem,EditorialClaimEvidence,EditorialRef,ReviewPreflight} from './editorial-types';
import {assessGeoDraftCopy,detectGeoDraftLocale,splitGeoDraftReviewText} from './geo-draft-quality';
import {editorialPublicationIssues,validateEditorialItem} from './editorial-workflow';
import {getCompetitorDomains} from './source-policy-store';
import {auditBody,isDisplayable} from './source-policy';
import {officialSourceQueries,officialResultsFromRss} from './editorial-official-source-search';
import {getSupabaseCredentials} from './storage-mode';
import {getGeoFeedbackIndex,excludesEditorial,excludesFaq} from './geo-agent-feedback';
import {editorialPath} from './content-impact';
export type PublicationReceipt={urls:string[];proofs:Array<EditorialClaimEvidence&{checked_at:string;verified_by:'live_official_exact_quote'}>};
type Kind='faq'|'editorial';
type Candidate={kind:'faq';item:ContentDraft}|{kind:'editorial';item:EditorialItem};
type Result={total:number;matched:number;proofs:EditorialClaimEvidence[];complete:boolean};
const evidence=require('./telegram-ops-advanced-evidence.cjs') as {
 digest:(kind:Kind,fields:string[])=>string;safeUrl:(s:unknown)=>string|null;topicUrls:(target:string)=>string[];
 readBounded:(r:Response,limit:number,mime:RegExp)=>Promise<string|null>;
 page:(url:string,request?:typeof fetch)=>Promise<string[]>;
 liveProofReceipt:(fields:string[],claims:EditorialClaimEvidence[],refs:EditorialRef[],request?:typeof fetch)=>Promise<PublicationReceipt|null>;
 match:(fields:string[],pages:{url:string;sentences:string[]}[])=>Result;
 eligible:(meta:ReviewPreflight|undefined,kind:Kind,fields:string[])=>boolean;
 due:(meta:ReviewPreflight|undefined,kind:Kind,fields:string[])=>boolean;
 editorialIdentityFields:(item:EditorialItem,copyFields:string[])=>string[];
 selectReviewBatch:(items:Candidate[])=>Candidate[];
 discoveryRepairDue:(x:Candidate)=>boolean;
 SOURCE_DISCOVERY_VERSION:string;
 assessPublicationRisk:(kind:Kind,item:ContentDraft|EditorialItem,copyFields:string[],result:Result)=>'low'|'high';
 faqTopicTargets:(title:string)=>string[];
 selectOfficialCandidates:(targets:string[],saved:string[],discovered:string[])=>string[];
};
function fields(x:Candidate):string[]{
 if(x.kind==='faq')return [x.item.a.trim()];
 const i=x.item;
 return [i.title,i.summary,i.body,...(i.h1_suggestion?[i.h1_suggestion]:[]),...(i.sections||[]).flatMap(s=>[s.h2,s.body,...(s.subsections||[]).flatMap(h=>[h.h3,h.body])]),...(i.internal_links||[]).map(l=>l.anchor)];
}
// Bind the question, editorial identity, risk and visitor copy, not only the answer.
function identityFields(x:Candidate):string[]{
 return x.kind==='faq'?['review-v2',x.item.q,x.item.risk_level||'',...fields(x)]:evidence.editorialIdentityFields(x.item,fields(x));
}
export function reviewCopyQuality(x:Candidate):boolean{
 if(x.kind==='faq')return !splitGeoDraftReviewText(x.item.a).note&&assessGeoDraftCopy(x.item.q,x.item.a).publishable&&!editorialPublicationIssues({kind:'guide',title:x.item.q,body:x.item.a}).length;
 try{return !editorialPublicationIssues(x.item).length&&!!editorialPath(x.item)&&!!validateEditorialItem(x.item)}catch{return false}
}
export function readyForHuman(x:Candidate){
 return reviewCopyQuality(x)&&evidence.eligible(x.item.review_preflight,x.kind,identityFields(x))&&Boolean(x.item.claim_evidence?.length);
}
export async function reviewContentPolicy(x:Candidate){
 const [domains,feedback]=await Promise.all([getCompetitorDomains(),getGeoFeedbackIndex()]);
 return domains!==null&&!auditBody([...(x.kind==='faq'?[x.item.q]:[]),...fields(x)].join('\n'),domains).length&&
  (x.kind==='faq'?!excludesFaq(feedback,x.item.q):!excludesEditorial(feedback,x.item,editorialPath(x.item)||undefined));
}
async function discover(x:Candidate){
 const title=x.kind==='faq'?x.item.q:x.item.title;
 const lang=x.kind==='faq'?detectGeoDraftLocale(title):x.item.lang;
 const targets=x.kind==='editorial'?Array.from(new Set([x.item.related_service||x.item.target,...evidence.faqTopicTargets([title,x.item.primary_keyword||''].join(' '))])):evidence.faqTopicTargets(title);
 const query=officialSourceQueries({title,lang,target:targets[0],...(x.kind==='editorial'?{primary_keyword:x.item.primary_keyword}:{})})[0];
 const saved=(x.item.evidence_refs||[]).map(r=>evidence.safeUrl(r.url)).filter((u):u is string=>!!u);
 let discovered:string[]=[];
 if(query)try{
  const r=await fetch('https://www.bing.com/search?format=rss&q='+encodeURIComponent(query),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(7000),headers:{Accept:'application/rss+xml'}});
  const xml=await evidence.readBounded(r,250000,/(?:rss|xml)/i);
  if(xml)discovered=officialResultsFromRss(xml,5).map(r=>evidence.safeUrl(r.url)).filter((u):u is string=>!!u);
 }catch{}
 return evidence.selectOfficialCandidates(targets,saved,discovered);
}
async function check(x:Candidate):Promise<Candidate>{
 // Only a trailing procedural note may be removed, and only if remaining
 // copy passes all checks and has live exact coverage. No legal paraphrase.
 const candidate:Candidate=x.kind==='faq'?{kind:'faq',item:{...x.item,a:splitGeoDraftReviewText(x.item.a).answer}}:x;
 const allowed=await reviewContentPolicy(candidate).catch(()=>false);
 const urls=allowed?await discover(candidate):[];
 const pages=await Promise.all(urls.map(async url=>({url,sentences:await evidence.page(url)})));
 const result=evidence.match(fields(candidate),pages);
 const ready=allowed&&result.complete&&reviewCopyQuality(candidate);
 const reviewed=ready?candidate:x;
 // Preserve existing high-risk classifications; detect mislabeled sensitive
 // copy before saving the digest. Never grant low risk from missing evidence.
 const classified=evidence.assessPublicationRisk(reviewed.kind,reviewed.item,fields(reviewed),result);
 const original:Candidate=classified==='high'&&reviewed.item.risk_level==='low'
  ?({...reviewed,item:{...reviewed.item,risk_level:'high'}} as Candidate):reviewed;
 const prior=x.item.review_preflight;
 const same=prior?.digest===evidence.digest(x.kind,identityFields(x));
 const attempts=(same?(prior?.attempts||0):0)+1;
 const exhausted=allowed&&pages.some(p=>p.sentences.length)&&(!result.complete||!reviewCopyQuality(candidate))&&attempts>=3;
 const meta:ReviewPreflight={status:ready?'ready':'blocked',source_discovery_version:evidence.SOURCE_DISCOVERY_VERSION,attempts,archived:!ready&&exhausted,digest:evidence.digest(x.kind,identityFields(original)),checked_at:new Date().toISOString(),matched:result.matched,total:result.total,reason:!allowed?'policy_unavailable_or_excluded':!urls.length?'no_official_candidates':!pages.some(p=>p.sentences.length)?'official_sources_unavailable':!result.complete?'exact_claim_coverage_incomplete':!reviewCopyQuality(candidate)?'copy_quality_failed':'ready'};
 if(!ready)return {...original,item:{...original.item,review_preflight:meta}} as Candidate;
 const refs:EditorialRef[]=Array.from(new Set(result.proofs.map(p=>p.url))).map(url=>({id:'official_'+createHash('sha256').update(url).digest('hex').slice(0,24),label:new URL(url).hostname,source:'official_live_html',kind:'official_candidate',url,observed_at:meta.checked_at}));
 const existing=(original.item.evidence_refs||[]).filter(r=>!refs.some(n=>n.id===r.id||n.url===r.url));
 const evidence_refs=[...refs,...existing].slice(0,12);
 return {...original,item:{...original.item,evidence_refs,evidence_ids:evidence_refs.map(r=>r.id),claim_evidence:result.proofs,review_preflight:meta}} as Candidate;
}
// A ready badge is not authorization. Re-read exactly the saved source pages
// and policy at confirmation, before the existing versioned admin mutation.
export async function liveReadyForHuman(x:Candidate):Promise<boolean>{
 if(!readyForHuman(x)||!await reviewContentPolicy(x).catch(()=>false))return false;
 const claims=x.item.claim_evidence||[];
 const urls=Array.from(new Set(claims.map(p=>p.url)));
 if(urls.length>3||urls.some(u=>!evidence.safeUrl(u)))return false;
 const pages=await Promise.all(urls.map(async url=>({url,sentences:await evidence.page(url)})));
 const result=evidence.match(fields(x),pages);
 return result.complete&&claims.length===result.proofs.length&&claims.every(p=>p.claim===p.quote&&result.proofs.some(q=>q.claim===p.claim&&q.url===p.url));
}
// Automated publication is stricter than human review. Exact quotations in
// the same locale only; translated/paraphrased or regulated copy stays queued.
export function autoPublicationBlockReason(x:Candidate):string|null{
 try{
  if(x.item.status!=='pending')return 'not_pending';
  if(x.item.risk_level!=='low')return 'risk_not_low';
  if(x.item.review_preflight?.archived===true)return 'review_archived';
  if(!reviewCopyQuality(x))return 'requires_finished_visitor_copy';
  const meta=x.item.review_preflight;
  if(!meta)return 'review_not_checked';
  if(meta.status!=='ready')return 'review_blocked';
  if(!evidence.eligible(meta,x.kind,identityFields(x)))return 'review_version_or_freshness_invalid';
  if(!x.item.claim_evidence?.length)return 'claim_evidence_missing';
  if(evidence.assessPublicationRisk(x.kind,x.item,fields(x),{complete:true,total:meta.total,matched:meta.matched,proofs:x.item.claim_evidence||[]})!=='low')return 'independent_risk_check_failed';
  if(x.kind==='editorial'){
   if(detectGeoDraftLocale(x.item.title)!==x.item.lang||
      !assessGeoDraftCopy(x.item.title,x.item.body).publishable)return 'editorial_locale_or_copy_invalid';
  }
  return null;
 }catch{return 'invalid_candidate'}
}
export function canProbeAutoPublication(x:Candidate):boolean{return autoPublicationBlockReason(x)===null;}
export async function liveAutoPublicationReceipt(x:Candidate,request:typeof fetch=fetch):Promise<PublicationReceipt|null>{
 if(!canProbeAutoPublication(x)||!await reviewContentPolicy(x).catch(()=>false))return null;
 // The authority allowlist does not override the current competitor registry.
 // Check stored proof URLs against the registry before any official fetch.
 const domains=await getCompetitorDomains().catch(()=>null);
 if(domains===null||!(x.item.claim_evidence||[]).every(p=>isDisplayable(p.url,domains)))return null;
 const receipt=await evidence.liveProofReceipt(fields(x),x.item.claim_evidence||[],x.item.evidence_refs||[],request);
 if(!receipt||receipt.proofs.length!==x.item.review_preflight?.matched||
    receipt.proofs.length!==x.item.review_preflight?.total)return null;
 return receipt;
}
// Existing signed tick only, at most four candidates and 3 source URLs each.
// One version-checked save; conflicts are not retried blindly.
export async function runReviewEvidenceBatch(){
 if(!getSupabaseCredentials())return {status:'storage_unavailable',processed:0,ready:0};
 const c=await getContent();
 const items:Candidate[]=[...c.drafts.filter(i=>i.status==='pending').map(item=>({kind:'faq' as const,item})),...c.editorialItems.filter(i=>i.status==='pending').map(item=>({kind:'editorial' as const,item}))];
 const technical=items.filter(x=>x.kind==='editorial'&&['technical_seo','internal_link'].includes(x.item.kind));
 const visitorItems=items.filter(x=>!technical.includes(x));
 const selected=evidence.selectReviewBatch(visitorItems.filter(x=>evidence.discoveryRepairDue(x)||evidence.due(x.item.review_preflight,x.kind,identityFields(x))));
 if(!selected.length)return {status:'idle',processed:0,ready:0,technical_tasks:technical.length};
 const checked=await Promise.all(selected.map(check));
 const faq=new Map<ContentDraft,ContentDraft>(),editorial=new Map<EditorialItem,EditorialItem>();
 for(let i=0;i<selected.length;i++){
  const before=selected[i],after=checked[i];
  if(before.kind==='faq'&&after.kind==='faq')faq.set(before.item,after.item);
  if(before.kind==='editorial'&&after.kind==='editorial')editorial.set(before.item,after.item);
 }
 const patch:Partial<SiteContent>={...(faq.size?{drafts:c.drafts.map(i=>faq.get(i)||i)}:{}),...(editorial.size?{editorialItems:c.editorialItems.map(i=>editorial.get(i)||i)}:{})};
 await setContent(patch,{replaceArrays:true,expectedUpdatedAt:c.updatedAt});
 const saved=await getContent();
 const verified=checked.every(x=>{
  const records=x.kind==='faq'?saved.drafts.filter(i=>i.q===(x.item as ContentDraft).q):saved.editorialItems.filter(i=>i.id===(x.item as EditorialItem).id);
  return records.some(i=>i.review_preflight?.digest===x.item.review_preflight?.digest&&i.review_preflight?.checked_at===x.item.review_preflight?.checked_at&&i.review_preflight?.source_discovery_version===evidence.SOURCE_DISCOVERY_VERSION&&i.status==='pending');
 });
 if(!verified)throw Error('review_evidence_readback_unverified');
 return {status:'saved_verified',processed:checked.length,ready:checked.filter(readyForHuman).length,technical_tasks:technical.length};
}
