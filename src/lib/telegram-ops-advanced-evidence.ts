import {createHash} from 'node:crypto';
import {getContent,setContent,type ContentDraft,type SiteContent} from './content-store';
import type {EditorialItem,EditorialClaimEvidence,EditorialRef,ReviewPreflight,SemanticShadowReceipt,EvidenceLane} from './editorial-types';
import {assessGeoDraftCopy,detectGeoDraftLocale,splitGeoDraftReviewText,faqLocale} from './geo-draft-quality';
import {editorialPublicationIssues,validateEditorialItem} from './editorial-workflow';
import {getCompetitorDomains} from './source-policy-store';
import {auditBody,isDisplayable} from './source-policy';
import {officialSourceQueries,officialResultsFromRss} from './editorial-official-source-search';
import {getSupabaseCredentials} from './storage-mode';
import {getGeoFeedbackIndex,excludesEditorial,excludesFaq} from './geo-agent-feedback';
import {editorialPath} from './content-impact';
import {catalogProofPage,isCatalogProofUrl,catalogFeeFaqAnswer} from './geo-publication-catalog';
const lanes=require('./geo-evidence-lanes.cjs') as {classify:(kind:Kind,item:ContentDraft|EditorialItem,fields:string[],planning?:boolean)=>EvidenceLane;VERSION:string};
export type PublicationReceipt={urls:string[];proofs:Array<EditorialClaimEvidence&{checked_at:string;verified_by:'live_official_exact_quote'|'first_party_catalog_exact'}>};
type Kind='faq'|'editorial';
type Candidate={kind:'faq';item:ContentDraft}|{kind:'editorial';item:EditorialItem};
type SemanticPacket={packetDigest:string;versionDigest:string;claims:unknown[]};
const semantic=require('./geo-semantic-review.cjs') as {prepare:(input:{kind:Kind;locale:string;versionDigest:string;context:string;fields:string[];pages:{url:string;sentences:string[]}[]})=>SemanticPacket|null};
const shadow=require('./geo-openrouter-review.cjs') as {reviewCandidate:(packet:SemanticPacket)=>Promise<{status:'openrouter_shadow_pass'|'blocked';reason:string;reviewedClaims?:number;requests:number;reviewers:Array<{model:string;provider:string;cost:0}>}>};
type Result={total:number;matched:number;proofs:EditorialClaimEvidence[];complete:boolean};
type RepairProposal={slot:number;q?:unknown;a?:unknown;title?:unknown;summary?:unknown;body?:unknown};
const repair=require('./geo-backlog-repair.cjs') as {VERSION:string;snippets:(text:string,pages:SourcePage[])=>{url:string;text:string}[];prompt:(entries:unknown[])=>string;proposals:(results:unknown[],n:number)=>RepairProposal[];selectBacklogBatch:(items:Candidate[],select:(items:Candidate[],limit?:number)=>Candidate[],canRepair:(x:Candidate)=>boolean,priority:(x:Candidate)=>boolean)=>Candidate[];repairDue:(meta:ReviewPreflight|undefined)=>boolean;sourceReadySlots:<T extends {entry:{kind:Kind;excerpts:unknown[]}}>(inputs:(T|null)[],limit?:number)=>T[];repairInputStatus:(inputs:unknown[],configured:boolean)=>string};
const REPAIR_VERSION=repair.VERSION;
const repairProvider=require('./geo-openrouter-review.cjs') as {runReviews:(x:{prompt:string;deadlineMs:number;maxModels:number;assessResults:(results:unknown[])=>{status:string;reason:string}})=>Promise<{requests:number;status:string;reason:string}>};
const safeRepairText=(s:unknown,max:number):s is string=>typeof s==='string'&&!!s.trim()&&s.length<=max&&!/<[^>]+>|https?:\/\//i.test(s);
function localeFor(x:Candidate){return x.kind==='faq'?(x.item.lang||detectGeoDraftLocale(x.item.q)):x.item.lang}
function replaceCopy(x:Candidate,p:RepairProposal):Candidate|null{
 if(x.kind==='faq'){
  if(!safeRepairText(p.q,1000)||!safeRepairText(p.a,5000))return null;
  const q=detectGeoDraftLocale(x.item.q)===localeFor(x)?x.item.q:p.q;
  const next={...x.item,q,a:p.a,lang:localeFor(x),review_preflight:undefined,claim_evidence:undefined};
  return faqLocale(next)&&assessGeoDraftCopy(next.q,next.a).publishable?{kind:'faq',item:next}:null;
 }
 if(!safeRepairText(p.title,170)||!safeRepairText(p.summary,360)||!safeRepairText(p.body,10000))return null;
 const next={...x.item,title:p.title,summary:p.summary,body:p.body,sections:undefined,h1_suggestion:undefined,internal_links:undefined,review_preflight:undefined,claim_evidence:undefined};
 try{return detectGeoDraftLocale(next.title)===next.lang&&assessGeoDraftCopy(next.title,next.body).publishable&&validateEditorialItem(next)&&!editorialPublicationIssues(next).length?{kind:'editorial',item:next}:null}catch{return null}
}
const evidence=require('./telegram-ops-advanced-evidence.cjs') as {
 digest:(kind:Kind,fields:string[])=>string;safeUrl:(s:unknown)=>string|null;topicUrls:(target:string)=>string[];
 readBounded:(r:Response,limit:number,mime:RegExp)=>Promise<string|null>;
 page:(url:string,request?:typeof fetch)=>Promise<string[]>;
 liveProofReceipt:(fields:string[],claims:EditorialClaimEvidence[],refs:EditorialRef[],request?:typeof fetch)=>Promise<PublicationReceipt|null>;
 match:(fields:string[],pages:{url:string;sentences:string[]}[])=>Result;
 matchPublication:(fields:string[],pages:{url:string;sentences:string[]}[],lane:EvidenceLane,catalog:{url:string;sentences:string[]})=>Result;
 livePublicationReceipt:(fields:string[],claims:EditorialClaimEvidence[],refs:EditorialRef[],lane:EvidenceLane,catalog:{url:string;sentences:string[]},request?:typeof fetch)=>Promise<PublicationReceipt|null>;
 eligible:(meta:ReviewPreflight|undefined,kind:Kind,fields:string[])=>boolean;
 due:(meta:ReviewPreflight|undefined,kind:Kind,fields:string[])=>boolean;
 editorialIdentityFields:(item:EditorialItem,copyFields:string[])=>string[];
 selectReviewBatch:(items:Candidate[],limit?:number)=>Candidate[];
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
export function evidenceLane(x:Candidate):EvidenceLane{
 try{return lanes.classify(x.kind,x.item,fields(x),x.kind==='editorial'&&editorialPublicationIssues(x.item).length>0)}catch{return 'unknown'}
}
// Bind the question, editorial identity, risk and visitor copy, not only the answer.
function identityFields(x:Candidate):string[]{
 return x.kind==='faq'?['review-v2',x.item.q,x.item.risk_level||'',...fields(x)]:evidence.editorialIdentityFields(x.item,fields(x));
}
export function reviewCopyQuality(x:Candidate):boolean{
 if(x.kind==='faq')return faqLocale(x.item)!==null&&!splitGeoDraftReviewText(x.item.a).note&&assessGeoDraftCopy(x.item.q,x.item.a).publishable&&!editorialPublicationIssues({kind:'guide',title:x.item.q,body:x.item.a}).length;
 try{return !editorialPublicationIssues(x.item).length&&!!editorialPath(x.item)&&!!validateEditorialItem(x.item)}catch{return false}
}
function catalogFor(x:Candidate){return catalogProofPage(localeFor(x))}
function riskFor(x:Candidate,result:Result):'low'|'medium'|'high'{
 const lane=evidenceLane(x);
 if(lane==='regulatory'||lane==='mixed'||lane==='implementation')return 'high';
 if(!result.complete||result.matched!==result.total)return 'high';
 if(lane==='commercial')return 'medium';
 return evidence.assessPublicationRisk(x.kind,x.item,fields(x),result);
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
 const lang=localeFor(x);
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
type SourcePage={url:string;sentences:string[]};
async function check(x:Candidate,collectPacket?:(packet:SemanticPacket)=>void,collectPages?:(pages:SourcePage[])=>void,providedPages?:SourcePage[],allowCatalogRepair=true):Promise<Candidate>{
 // Only a trailing procedural note may be removed, and only if remaining
 // copy passes all checks and has live exact coverage. No legal paraphrase.
 if(allowCatalogRepair&&x.kind==='faq'){
  const answer=catalogFeeFaqAnswer(x.item.q,localeFor(x));
  if(answer&&answer!==x.item.a&&await reviewContentPolicy(x).catch(()=>false)){
   const next={kind:'faq' as const,item:{...x.item,a:answer,lang:localeFor(x),review_preflight:undefined,claim_evidence:undefined}};
   const verified=await check(next,undefined,undefined,[],false);
   if(readyForHuman(verified)&&autoPublicationBlockReason(verified,true)===null){
    verified.item.review_preflight!.repair_version=REPAIR_VERSION;
    verified.item.review_preflight!.repair_attempted_at=new Date().toISOString();
    return verified;
   }
  }
 }
 const candidate:Candidate=x.kind==='faq'?{kind:'faq',item:{...x.item,a:splitGeoDraftReviewText(x.item.a).answer}}:x;
 const allowed=await reviewContentPolicy(candidate).catch(()=>false);
 const lane=evidenceLane(candidate);
 // Technical proposals never become visitor copy. Approved commercial
 // scope is checked against the deployed catalog, not a government website.
 if(lane==='implementation'){
  const prior=x.item.review_preflight;
  const meta:ReviewPreflight={status:'blocked',digest:evidence.digest(x.kind,identityFields(x)),checked_at:new Date().toISOString(),matched:0,total:0,reason:'implementation_handoff',attempts:(prior?.attempts||0)+1,archived:false,...(prior?.repair_version===REPAIR_VERSION?{repair_version:prior.repair_version,repair_attempted_at:prior.repair_attempted_at}:{}),source_discovery_version:evidence.SOURCE_DISCOVERY_VERSION,evidence_lane:lane,evidence_lane_version:lanes.VERSION};
  return {...x,item:{...x.item,review_preflight:meta}} as Candidate;
 }
 const catalog=catalogFor(candidate);
 const catalogComplete=allowed&&evidence.matchPublication(fields(candidate),[],lane,catalog).complete;
 const urls=allowed&&lane!=='commercial'&&!catalogComplete?(providedPages?providedPages.map(p=>p.url):await discover(candidate)):[];
 const pages=providedPages||await Promise.all(urls.map(async url=>({url,sentences:await evidence.page(url)})));
 collectPages?.(pages);
 const result=evidence.matchPublication(fields(candidate),pages,lane,catalogFor(candidate));
 const ready=allowed&&result.complete&&reviewCopyQuality(candidate);
 const reviewed=ready?candidate:x;
 const classified=riskFor(reviewed,result);
 const original={...reviewed,item:{...reviewed.item,risk_level:classified}} as Candidate;
 const prior=x.item.review_preflight;
 const same=prior?.digest===evidence.digest(x.kind,identityFields(x));
 const attempts=(same?(prior?.attempts||0):0)+1;
 const exhausted=allowed&&pages.some(p=>p.sentences.length)&&(!result.complete||!reviewCopyQuality(candidate))&&attempts>=3;
 const meta:ReviewPreflight={evidence_lane:lane,evidence_lane_version:lanes.VERSION,status:ready?'ready':'blocked',source_discovery_version:evidence.SOURCE_DISCOVERY_VERSION,attempts,archived:!ready&&exhausted,digest:evidence.digest(x.kind,identityFields(original)),checked_at:new Date().toISOString(),matched:result.matched,total:result.total,reason:!allowed?'policy_unavailable_or_excluded':!result.complete?(lane==='commercial'?'first_party_scope_not_fully_verified':!urls.length?'no_official_candidates':!pages.some(p=>p.sentences.length)?'official_sources_unavailable':'exact_claim_coverage_incomplete'):!reviewCopyQuality(candidate)?'copy_quality_failed':'ready'};
 // Preserve only version-bound shadow diagnostics; they are never exact proof.
 if(prior?.semantic_shadow?.version_digest===meta.digest)meta.semantic_shadow=prior.semantic_shadow;
 if(prior?.repair_version===REPAIR_VERSION&&prior?.digest===meta.digest){meta.repair_version=prior.repair_version;meta.repair_attempted_at=prior.repair_attempted_at;}
 if(collectPacket&&!ready&&allowed&&reviewCopyQuality(original)&&!meta.archived&&!meta.semantic_shadow){
  const title=original.kind==='faq'?original.item.q:original.item.title;
  const locale=original.kind==='faq'?detectGeoDraftLocale(title):original.item.lang;
  const packet=semantic.prepare({kind:original.kind,locale,versionDigest:meta.digest,context:title,fields:fields(original),pages:pages.filter(p=>p.sentences.length)});
  if(packet)collectPacket(packet);
 }
 if(!ready)return {...original,item:{...original.item,review_preflight:meta}} as Candidate;
 const refs:EditorialRef[]=Array.from(new Set(result.proofs.map(p=>p.url))).map(url=>({id:'official_'+createHash('sha256').update(url).digest('hex').slice(0,24),label:new URL(url).hostname,source:isCatalogProofUrl(url)?'approved_package_catalog':'official_live_html',kind:isCatalogProofUrl(url)?'first_party_catalog':'official_candidate',url,observed_at:meta.checked_at}));
 const existing=(original.item.evidence_refs||[]).filter(r=>!refs.some(n=>n.id===r.id||n.url===r.url));
 const evidence_refs=[...refs,...existing].slice(0,12);
 return {...original,item:{...original.item,evidence_refs,evidence_ids:evidence_refs.map(r=>r.id),claim_evidence:result.proofs,review_preflight:meta}} as Candidate;
}
// A ready badge is not authorization. Re-read exactly the saved source pages
// and policy at confirmation, before the existing versioned admin mutation.
export async function liveReadyForHuman(x:Candidate):Promise<boolean>{
 if(!readyForHuman(x)||!await reviewContentPolicy(x).catch(()=>false))return false;
 const receipt=await evidence.livePublicationReceipt(fields(x),x.item.claim_evidence||[],x.item.evidence_refs||[],evidenceLane(x),catalogFor(x));
 return !!receipt;
}
// Risk is metadata, not a blanket publication ban. Sensitive content requires
// the owner policy plus the same fresh, version-bound evidence as other copy.
export function autoPublicationBlockReason(x:Candidate,allowHighRisk=false):string|null{
 try{
  if(x.item.status!=='pending')return 'not_pending';
  const lane=evidenceLane(x);
  if(lane==='implementation')return 'implementation_handoff';
  if(!['low','medium','high'].includes(x.item.risk_level||''))return 'risk_unclassified';
  if(x.item.risk_level!=='low'&&!allowHighRisk)return 'sensitive_publication_disabled';
  if(x.item.review_preflight?.archived===true)return 'review_archived';
  if(x.kind==='faq'&&!faqLocale(x.item))return 'faq_translation_required';
  if(!reviewCopyQuality(x))return 'requires_finished_visitor_copy';
  const meta=x.item.review_preflight;
  if(!meta||meta.evidence_lane_version!==lanes.VERSION)return 'review_not_checked';
  if(meta.status!=='ready')return 'review_blocked';
  if(meta.evidence_lane!==lane)return 'review_lane_changed';
  if(!evidence.eligible(meta,x.kind,identityFields(x)))return 'review_version_or_freshness_invalid';
  if(!x.item.claim_evidence?.length)return 'claim_evidence_missing';
  if(riskFor(x,{complete:true,total:meta.total,matched:meta.matched,proofs:x.item.claim_evidence||[]})!==x.item.risk_level)return 'independent_risk_check_failed';
  if(x.kind==='editorial'&&(detectGeoDraftLocale(x.item.title)!==x.item.lang||!assessGeoDraftCopy(x.item.title,x.item.body).publishable))return 'editorial_locale_or_copy_invalid';
  return null;
 }catch{return 'invalid_candidate'}
}
export function canProbeAutoPublication(x:Candidate,allowHighRisk=false):boolean{return autoPublicationBlockReason(x,allowHighRisk)===null;}
export async function liveAutoPublicationReceipt(x:Candidate,request:typeof fetch=fetch,allowHighRisk=false):Promise<PublicationReceipt|null>{
 if(!canProbeAutoPublication(x,allowHighRisk)||!await reviewContentPolicy(x).catch(()=>false))return null;
 const domains=await getCompetitorDomains().catch(()=>null);
 if(domains===null||!(x.item.claim_evidence||[]).every(p=>isDisplayable(p.url,domains)))return null;
 const receipt=await evidence.livePublicationReceipt(fields(x),x.item.claim_evidence||[],x.item.evidence_refs||[],evidenceLane(x),catalogFor(x),request);
 if(!receipt||receipt.proofs.length!==x.item.review_preflight?.matched||receipt.proofs.length!==x.item.review_preflight?.total)return null;
 return receipt;
}
// Existing signed tick only, at most twelve candidates and 3 source URLs each.
// One version-checked save; conflicts are not retried blindly.
function shadowIdentity(receipt:SemanticShadowReceipt|undefined){
 if(!receipt)return null;
 return JSON.stringify([receipt.version_digest,receipt.packet_digest,receipt.checked_at,receipt.status,receipt.reason,receipt.reviewed_claims,receipt.requests,receipt.reviewers.map(r=>[r.model,r.provider,r.cost]),receipt.publication_authorized,receipt.independent_gateway_verified]);
}
export async function runReviewEvidenceBatch(){
 if(!getSupabaseCredentials())return {status:'storage_unavailable',processed:0,ready:0};
 const c=await getContent();
 const items:Candidate[]=[...c.drafts.filter(i=>i.status==='pending').map(item=>({kind:'faq' as const,item})),...c.editorialItems.filter(i=>i.status==='pending').map(item=>({kind:'editorial' as const,item}))];
 const technical=items.filter(x=>x.kind==='editorial'&&['technical_seo','internal_link'].includes(x.item.kind));
 const visitorItems=items.filter(x=>!technical.includes(x));
 const laneCounts:Record<string,number>={};
 for(const item of items){const lane=evidenceLane(item);laneCounts[lane]=(laneCounts[lane]||0)+1;}
 const repairable=(x:Candidate)=>repair.repairDue(x.item.review_preflight);
 const eligibleItems=visitorItems.filter(x=>{
  const lane=evidenceLane(x),meta=x.item.review_preflight;
  if(meta?.evidence_lane_version!==lanes.VERSION)return true;
  if(lane==='implementation'&&meta?.digest===evidence.digest(x.kind,identityFields(x))&&meta.repair_version===REPAIR_VERSION)return false;
  return repairable(x)||evidence.discoveryRepairDue(x)||evidence.due(x.item.review_preflight,x.kind,identityFields(x));
 });
 const selected=repair.selectBacklogBatch(eligibleItems,evidence.selectReviewBatch,repairable,x=>x.kind==='faq'&&!!catalogFeeFaqAnswer(x.item.q,localeFor(x)));
 if(!selected.length)return {status:'idle',processed:0,ready:0,technical_tasks:technical.length,evidence_lanes:laneCounts};
 const packets=new Map<number,SemanticPacket>();
 const sourcePages=new Map<number,SourcePage[]>();
 const checked:Candidate[]=[];
 // Bounded source I/O in groups of four, three official URLs per item.
 for(let offset=0;offset<selected.length;offset+=4){
  const group=await Promise.all(selected.slice(offset,offset+4).map((x,i)=>check(x,p=>packets.set(offset+i,p),p=>sourcePages.set(offset+i,p))));
  checked.push(...group);
 }
 // Reuse the existing free two-model review budget rather than add model calls.
 const repairDue=checked.map((x,i)=>({x,i})).filter(({x,i})=>x.item.review_preflight?.status==='blocked'&&!x.item.review_preflight.archived&&selected[i].item.review_preflight?.repair_version!==REPAIR_VERSION&&x.item.review_preflight.reason!=='policy_unavailable_or_excluded');
 // Gather from all already checked records (at most twelve), then allocate
 // at most four model slots to source-backed candidates. No extra source reads
 // for ordinary checked records; implementation plans use their existing cap.
 const prepareRepairInput=async ({i}:{i:number})=>{
  const original=selected[i];
  if(!await reviewContentPolicy(original).catch(()=>false))return null;
  let pages=sourcePages.get(i)||[];
  if(!pages.length&&evidenceLane(original)==='implementation'){
   pages=await Promise.all((await discover(original)).map(async url=>({url,sentences:await evidence.page(url)})));
  }
  const text=original.kind==='faq'?original.item.q+' '+original.item.a:[original.item.title,original.item.summary,original.item.body].join(' ');
  const own=original.kind==='editorial'&&original.item.kind==='packages'||['commercial','mixed'].includes(evidenceLane(original));
  const excerpts=repair.snippets(text,[...pages,...(own?[catalogFor(original)]:[])]);
  if(!excerpts.length)return null;
  return {i,original,pages,entry:{kind:original.kind,locale:localeFor(original),original:text.slice(0,2500),excerpts}};
 };
 const repairInputs:Awaited<ReturnType<typeof prepareRepairInput>>[]=[];
 for(let offset=0;offset<repairDue.length;offset+=4){
  repairInputs.push(...await Promise.all(repairDue.slice(offset,offset+4).map(prepareRepairInput)));
 }
 const inputs=repair.sourceReadySlots(repairInputs,4);
 const repairConfigured=Boolean(process.env.OPENROUTER_API_KEY);
 let repairRequests=0,repaired=checked.filter((x,i)=>x.kind==='faq'&&selected[i].kind==='faq'&&x.item.a!==(selected[i].item as ContentDraft).a&&readyForHuman(x)).length,repairStatus=repaired&&!inputs.length?'catalog_exact_repair':repair.repairInputStatus(inputs,repairConfigured);
 if(inputs.length&&repairConfigured){
  let proposals:RepairProposal[]=[];
  const trial=await repairProvider.runReviews({prompt:repair.prompt(inputs.map((x,slot)=>({...x.entry,slot}))),deadlineMs:45000,maxModels:2,assessResults:results=>{
   proposals=repair.proposals(results,inputs.length);
   return {status:'repair_proposals',reason:'not_publication_authority'};
  }}).catch(()=>({requests:0,status:'blocked',reason:'provider_unavailable'}));
  repairRequests=trial.requests;repairStatus=trial.status+':'+trial.reason;
  if(repairRequests>0)for(const input of inputs){
   const meta=checked[input.i].item.review_preflight!;
   meta.repair_version=REPAIR_VERSION;meta.repair_attempted_at=new Date().toISOString();
  }
  const used=new Set<number>();
  for(const proposal of proposals){
   if(used.has(proposal.slot))continue;
   const input=inputs[proposal.slot],next=replaceCopy(input.original,proposal);
   if(!next)continue;
   if(next.kind==='faq'&&(c.faqs.some(f=>f.q===next.item.q)||c.drafts.some(f=>f!==input.original.item&&f.q===next.item.q)||checked.some((f,j)=>j!==input.i&&f.kind==='faq'&&f.item.q===next.item.q)))continue;
   if(evidenceLane(next)==='implementation')continue;
   const verified=await check(next,undefined,undefined,input.pages);
   if(!readyForHuman(verified)||autoPublicationBlockReason(verified,true)!==null)continue;
   verified.item.review_preflight!.repair_version=REPAIR_VERSION;
   verified.item.review_preflight!.repair_attempted_at=new Date().toISOString();
   checked[input.i]=verified;used.add(proposal.slot);repaired++;
  }
 }
 // At most one real candidate per existing tick, with live verified zero-cost
 // OpenRouter quota. No credentials means no inference; no new scheduler.
 // Shadow diagnostics cannot unlock either human or automated publication.
 let shadowStatus='not_attempted';
 const index=checked.findIndex((x,i)=>packets.has(i)&&!!x.item.review_preflight);
 if(index>=0&&process.env.OPENROUTER_API_KEY&&repairRequests===0&&!inputs.length){
  const packet=packets.get(index)!;
  const r=await shadow.reviewCandidate(packet).catch(()=>({status:'blocked' as const,reason:'shadow_review_unavailable',reviewedClaims:0,requests:0,reviewers:[]}));
  const meta=checked[index].item.review_preflight!;
  // Do not consume a candidate's one review attempt if no inference occurred.
  if(r.requests>0)meta.semantic_shadow={version_digest:meta.digest,packet_digest:packet.packetDigest,checked_at:new Date().toISOString(),status:r.status,reason:r.reason,reviewed_claims:r.reviewedClaims||0,requests:r.requests,reviewers:r.reviewers,publication_authorized:false,independent_gateway_verified:false};
  shadowStatus=r.status+':'+r.reason;
 }else if(index>=0)shadowStatus='credential_unavailable';
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
  return records.some(i=>i.review_preflight?.digest===x.item.review_preflight?.digest&&i.review_preflight?.checked_at===x.item.review_preflight?.checked_at&&i.review_preflight?.source_discovery_version===evidence.SOURCE_DISCOVERY_VERSION&&i.review_preflight?.evidence_lane===x.item.review_preflight?.evidence_lane&&i.review_preflight?.evidence_lane_version===lanes.VERSION&&i.review_preflight?.repair_version===x.item.review_preflight?.repair_version&&shadowIdentity(i.review_preflight?.semantic_shadow)===shadowIdentity(x.item.review_preflight?.semantic_shadow)&&i.status==='pending');
 });
 if(!verified)throw Error('review_evidence_readback_unverified');
 return {status:'saved_verified',processed:checked.length,repaired,repair_status:repairStatus,repair_requests:repairRequests,repair_candidates:repairDue.length,repair_source_ready:repairInputs.filter(Boolean).length,repair_selected:inputs.length,ready:checked.filter(readyForHuman).length,technical_tasks:technical.length,semantic_shadow:shadowStatus,evidence_lanes:laneCounts};
}
