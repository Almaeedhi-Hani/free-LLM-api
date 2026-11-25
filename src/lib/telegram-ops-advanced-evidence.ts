import {createHash} from 'node:crypto';
import {getContent,setContent,type ContentDraft,type SiteContent} from './content-store';
import type {EditorialItem,EditorialClaimEvidence,EditorialRef,ReviewPreflight} from './editorial-types';
import {assessGeoDraftCopy,detectGeoDraftLocale,splitGeoDraftReviewText} from './geo-draft-quality';
import {editorialPublicationIssues,validateEditorialItem} from './editorial-workflow';
import {getCompetitorDomains} from './source-policy-store';
import {auditBody} from './source-policy';
import {officialSourceQueries,officialResultsFromRss} from './editorial-official-source-search';
import {getSupabaseCredentials} from './storage-mode';
import {getGeoFeedbackIndex,excludesEditorial,excludesFaq} from './geo-agent-feedback';
import {editorialPath} from './content-impact';
type Kind='faq'|'editorial';
type Candidate={kind:'faq';item:ContentDraft}|{kind:'editorial';item:EditorialItem};
type Result={total:number;matched:number;proofs:EditorialClaimEvidence[];complete:boolean};
const evidence=require('./telegram-ops-advanced-evidence.cjs') as {
 digest:(kind:Kind,fields:string[])=>string;safeUrl:(s:unknown)=>string|null;topicUrls:(target:string)=>string[];
 readBounded:(r:Response,limit:number,mime:RegExp)=>Promise<string|null>;
 page:(url:string,request?:typeof fetch)=>Promise<string[]>;
 match:(fields:string[],pages:{url:string;sentences:string[]}[])=>Result;
 eligible:(meta:ReviewPreflight|undefined,kind:Kind,fields:string[])=>boolean;
 due:(meta:ReviewPreflight|undefined,kind:Kind,fields:string[])=>boolean;
};
function fields(x:Candidate):string[]{
 if(x.kind==='faq')return [x.item.a.trim()];
 const i=x.item;
 return [i.title,i.summary,i.body,...(i.sections||[]).flatMap(s=>[s.h2,s.body,...(s.subsections||[]).flatMap(h=>[h.h3,h.body])]),...(i.internal_links||[]).map(l=>l.anchor)];
}
function quality(x:Candidate):boolean{
 if(x.kind==='faq')return !splitGeoDraftReviewText(x.item.a).note&&assessGeoDraftCopy(x.item.q,x.item.a).publishable&&!editorialPublicationIssues({kind:'guide',title:x.item.q,body:x.item.a}).length;
 try{return !editorialPublicationIssues(x.item).length&&!!editorialPath(x.item)&&!!validateEditorialItem(x.item)}catch{return false}
}
export function readyForHuman(x:Candidate){
 return quality(x)&&evidence.eligible(x.item.review_preflight,x.kind,fields(x))&&Boolean(x.item.claim_evidence?.length);
}
async function policy(x:Candidate){
 const [domains,feedback]=await Promise.all([getCompetitorDomains(),getGeoFeedbackIndex()]);
 return domains!==null&&!auditBody(fields(x).join('\n'),domains).length&&
  (x.kind==='faq'?!excludesFaq(feedback,x.item.q):!excludesEditorial(feedback,x.item,editorialPath(x.item)||undefined));
}
async function discover(x:Candidate){
 const title=x.kind==='faq'?x.item.q:x.item.title;
 const lang=x.kind==='faq'?detectGeoDraftLocale(title):x.item.lang;
 const query=officialSourceQueries({title,lang,...(x.kind==='editorial'?{primary_keyword:x.item.primary_keyword,target:x.item.related_service||x.item.target}:{})})[0];
 const saved=(x.item.evidence_refs||[]).map(r=>evidence.safeUrl(r.url)).filter((u):u is string=>!!u);
 let discovered:string[]=[];
 if(query)try{
  const r=await fetch('https://www.bing.com/search?format=rss&q='+encodeURIComponent(query),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(7000),headers:{Accept:'application/rss+xml'}});
  const xml=await evidence.readBounded(r,250000,/(?:rss|xml)/i);
  if(xml)discovered=officialResultsFromRss(xml,5).map(r=>evidence.safeUrl(r.url)).filter((u):u is string=>!!u);
 }catch{}
 const target=x.kind==='editorial'?x.item.related_service||x.item.target:'';
 return Array.from(new Set([...saved,...discovered,...evidence.topicUrls(target)])).slice(0,3);
}
async function check(x:Candidate):Promise<Candidate>{
 // Only a trailing procedural note may be removed, and only if remaining
 // copy passes all checks and has live exact coverage. No legal paraphrase.
 const candidate:Candidate=x.kind==='faq'?{kind:'faq',item:{...x.item,a:splitGeoDraftReviewText(x.item.a).answer}}:x;
 const allowed=await policy(candidate).catch(()=>false);
 const urls=allowed?await discover(candidate):[];
 const pages=await Promise.all(urls.map(async url=>({url,sentences:await evidence.page(url)})));
 const result=evidence.match(fields(candidate),pages);
 const ready=allowed&&result.complete&&quality(candidate);
 const original=ready?candidate:x;
 const meta:ReviewPreflight={status:ready?'ready':'blocked',digest:evidence.digest(x.kind,fields(original)),checked_at:new Date().toISOString(),matched:result.matched,total:result.total,reason:!allowed?'policy_unavailable_or_excluded':!urls.length?'no_official_candidates':!pages.some(p=>p.sentences.length)?'official_sources_unavailable':!result.complete?'exact_claim_coverage_incomplete':!quality(candidate)?'copy_quality_failed':'ready'};
 if(!ready)return {...original,item:{...original.item,review_preflight:meta}} as Candidate;
 const refs:EditorialRef[]=Array.from(new Set(result.proofs.map(p=>p.url))).map(url=>({id:'official_'+createHash('sha256').update(url).digest('hex').slice(0,24),label:new URL(url).hostname,source:'official_live_html',kind:'official_candidate',url,observed_at:meta.checked_at}));
 const existing=(original.item.evidence_refs||[]).filter(r=>!refs.some(n=>n.id===r.id||n.url===r.url));
 const evidence_refs=[...refs,...existing].slice(0,12);
 return {...original,item:{...original.item,evidence_refs,evidence_ids:evidence_refs.map(r=>r.id),claim_evidence:result.proofs,review_preflight:meta}} as Candidate;
}
// A ready badge is not authorization. Re-read exactly the saved source pages
// and policy at confirmation, before the existing versioned admin mutation.
export async function liveReadyForHuman(x:Candidate):Promise<boolean>{
 if(!readyForHuman(x)||!await policy(x).catch(()=>false))return false;
 const claims=x.item.claim_evidence||[];
 const urls=Array.from(new Set(claims.map(p=>p.url)));
 if(urls.length>3||urls.some(u=>!evidence.safeUrl(u)))return false;
 const pages=await Promise.all(urls.map(async url=>({url,sentences:await evidence.page(url)})));
 const result=evidence.match(fields(x),pages);
 return result.complete&&claims.length===result.proofs.length&&claims.every(p=>p.claim===p.quote&&result.proofs.some(q=>q.claim===p.claim&&q.url===p.url));
}
// Existing signed tick only, at most four candidates and 3 source URLs each.
// One version-checked save; conflicts are not retried blindly.
export async function runReviewEvidenceBatch(){
 if(!getSupabaseCredentials())return {status:'storage_unavailable',processed:0,ready:0};
 const c=await getContent();
 const items:Candidate[]=[...c.drafts.filter(i=>i.status==='pending').map(item=>({kind:'faq' as const,item})),...c.editorialItems.filter(i=>i.status==='pending').map(item=>({kind:'editorial' as const,item}))];
 const selected=items.filter(x=>evidence.due(x.item.review_preflight,x.kind,fields(x))).sort((a,b)=>(a.item.review_preflight?.checked_at||'').localeCompare(b.item.review_preflight?.checked_at||'')).slice(0,4);
 if(!selected.length)return {status:'idle',processed:0,ready:0};
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
 const verified=checked.every(x=>(x.kind==='faq'?saved.drafts.filter(i=>i.q===x.item.q):saved.editorialItems.filter(i=>i.id===x.item.id)).some(i=>i.review_preflight?.digest===x.item.review_preflight?.digest&&i.review_preflight?.checked_at===x.item.review_preflight?.checked_at&&i.status==='pending'));
 if(!verified)throw Error('review_evidence_readback_unverified');
 return {status:'saved_verified',processed:checked.length,ready:checked.filter(readyForHuman).length};
}
