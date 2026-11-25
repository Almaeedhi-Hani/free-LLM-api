import {getContent} from '../../content-store';
import {editorialPath} from '../../content-impact';
import {editorialPublicationIssues,validateEditorialItem} from '../../editorial-workflow';
import type {EditorialItem} from '../../editorial-types';
import {getCompetitorDomains} from '../../source-policy-store';
import {auditBody} from '../../source-policy';
import {getGeoFeedbackIndex,excludesEditorial,excludesFaq} from '../../geo-agent-feedback';
import {appendPublicationAudit,UNATTRIBUTED_PUBLICATION_ORIGIN} from '../../geo-publication-audit';
import type {PublicationOrigin,AuditPhase} from '../../geo-publication-audit';
import {getAutoPublicationStatus,restCall} from './policy-store';
import type {PublicationReceipt} from '../../telegram-ops-advanced-evidence';
import type {AutoPublishReport} from './types';

const publishableKinds=new Set(['guide','comparison','home','trust','service','packages']);
const unfinished=(x:EditorialItem)=>editorialPublicationIssues(x).length>0;
export async function runGuardedAutoPublishing(dryRun=false,origin:PublicationOrigin=UNATTRIBUTED_PUBLICATION_ORIGIN):Promise<AutoPublishReport>{
 const report:AutoPublishReport={status:'disabled',examined:0,published:0,skipped:0,events:[],message:''};
 const state=await getAutoPublicationStatus();
 if(!state.available)return {...report,status:'storage_unavailable',message:'Publication migration or storage unavailable'};
 if(!state.enabled&&!dryRun)return {...report,status:'disabled',message:'Automatic publication is not enabled'};
 let content;
 try{content=await getContent()}catch{
  return {...report,status:'storage_unavailable',message:'Cannot load saved content'};
 }
 // A missing/failed feedback store must not silently publish a rejected topic.
 let feedback;
 try{feedback=await getGeoFeedbackIndex()}catch{
  return {...report,status:'storage_unavailable',message:'Reviewer feedback could not be loaded'};
 }
 // If the competitor registry is unavailable, source preflight fails closed.
 const competitorDomains=await getCompetitorDomains().catch(()=>null);
 const editorial=(content.editorialItems||[]).filter(e=>e.status==='pending');
 const faqDrafts=(content.drafts||[]).filter(d=>d.status==='pending');
 report.examined=editorial.length+faqDrafts.length;
 const publishable=editorial.filter(e=>publishableKinds.has(e.kind));
 const verifier=await import('../../telegram-ops-advanced-evidence');
 if(dryRun){
  // Use exactly the stored-version gate of the actual worker. No external
  // source requests or writes; a candidate still needs live proof and RPC.
  const reasons:Record<string,number>={};
  let readyForProbe=0;
  const count=(reason:string|null)=>{if(reason)reasons[reason]=(reasons[reason]||0)+1;else readyForProbe++;};
  for(const item of publishable){
   const path=editorialPath(item);
   count(!path||unfinished(item)?'requires_finished_visitor_copy':excludesEditorial(feedback,item,path)?'reviewer_excluded':
    competitorDomains===null?'source_policy_unavailable':verifier.autoPublicationBlockReason({kind:'editorial',item}));
  }
  for(const draft of faqDrafts){
   count(excludesFaq(feedback,draft.q)?'reviewer_excluded':
    typeof draft.q!=='string'||typeof draft.a!=='string'||draft.q.trim().length<5||draft.a.trim().length<30?'invalid_faq_structure':
    competitorDomains===null?'source_policy_unavailable':verifier.autoPublicationBlockReason({kind:'faq',item:draft}));
  }
  return {...report,status:'dry_run',skipped:publishable.length+faqDrafts.length-readyForProbe,message:JSON.stringify({
   pending_editorial:editorial.length,pending_faq:faqDrafts.length,
   visitor_page_candidates:publishable.length,technical_tasks:editorial.length-publishable.length,
   source_requirement:'automated_verification_required',publication_enabled:state.enabled,
   high_risk_permission:state.allow_high_risk,blocked_by_reason:reasons,
   ready_for_live_probe:readyForProbe,eligible_to_publish:0,dry_run_only:true
  })};
 }
 // A legacy RPC cannot receive an unversioned fallback. This read-only
 // handshake keeps deployment safe while the prepared DB migration is pending.
 try{
  const contract=await restCall('rpc/geo_publication_contract_version');
  if(contract!=='exact-proof-v1')throw Error('unexpected_publication_contract');
 }catch{return {...report,status:'storage_unavailable',message:'Version-bound publication contract not installed; nothing published'}}
 // One append-only audit trail for both schedulers. RPCs fail closed if
 // their pre-attempt audit cannot be durably saved.
 const audit=async(kind:'editorial'|'faq',itemId:string,phase:AuditPhase,
  result?:string,startedAuditId?:string,publicationEventId?:string)=>
  appendPublicationAudit({kind,itemId,phase,result,origin,startedAuditId,publicationEventId});
 const storageAuditFailure=():AutoPublishReport=>({...report,status:'storage_unavailable',
  message:'Publication audit unavailable; no further publication attempted'});
 const recordSkip=async(kind:'editorial'|'faq',id:string,result:string):Promise<boolean>=>{
  try{await audit(kind,id,'evaluation',result)}catch{return false}
  report.skipped++;
  report.events.push({item_id:id,result});
  return true;
 };
 // Existing DB quota governs the combined publication count, with strict
 // transactional locks. Never retry ambiguous writes.
 // At most two fresh probes per queue (four total) per invocation. The
 // shared rolling DB quota still caps successful publications at ten.
 let editorialProbes=0,faqProbes=0;
 for(const candidate of publishable){
  const path=editorialPath(candidate);
  if(path&&excludesEditorial(feedback,candidate,path)){
   if(!(await recordSkip('editorial',candidate.id,'reviewer_excluded')))return storageAuditFailure();
   continue;
  }
  if(!path||unfinished(candidate)){
   if(!(await recordSkip('editorial',candidate.id,'requires_finished_visitor_copy')))return storageAuditFailure();
   continue;
  }
  if(competitorDomains===null||!verifier.canProbeAutoPublication({kind:'editorial',item:candidate})){
   if(!(await recordSkip('editorial',candidate.id,competitorDomains===null?'source_policy_unavailable':verifier.autoPublicationBlockReason({kind:'editorial',item:candidate})||'version_or_evidence_not_ready')))return storageAuditFailure();
   continue;
  }
  if(editorialProbes>=2){if(!(await recordSkip('editorial',candidate.id,'live_probe_budget_reached')))return storageAuditFailure();continue;}
  editorialProbes++;
  const receipt:PublicationReceipt|null=await verifier.liveAutoPublicationReceipt({kind:'editorial',item:candidate}).catch(()=>null);
  if(!receipt){if(!(await recordSkip('editorial',candidate.id,'live_exact_proof_not_verified')))return storageAuditFailure();continue;}
  const cited=receipt.urls;
  if(auditBody([candidate.title,candidate.summary,candidate.body,candidate.h1_suggestion||''].join('\n'),competitorDomains).length){
   if(!(await recordSkip('editorial',candidate.id,'competitor_link_in_public_copy')))return storageAuditFailure();continue;
  }
  try{
   validateEditorialItem({...candidate,status:'approved',
    reviewedAt:new Date().toISOString(),approval_method:'automated',
    verified_sources:cited,cited_sources:cited,source_verification:'independently_checked'});
  }catch{
   if(!(await recordSkip('editorial',candidate.id,'invalid_publication_structure')))return storageAuditFailure();
   continue;
  }
  let startedAuditId:string;
  try{startedAuditId=await audit('editorial',candidate.id,'rpc_started')}
  catch{return storageAuditFailure()}
  let value:{status?:string;target_path?:string;event_id?:string};
  try{
   value=await restCall('rpc/geo_commit_auto_publication',{
    method:'POST',body:{p_item_id:candidate.id,p_verified_urls:cited,p_claim_proofs:receipt.proofs,p_expected_item:candidate}
   }) as typeof value;
  }catch{
   // The database may have committed even if the network reply was lost.
   try{await audit('editorial',candidate.id,'rpc_result','ambiguous',startedAuditId)}catch{}
   return {...report,status:'error',message:'Publication RPC outcome ambiguous. Reconcile audit and D06; never retry blindly.'};
  }
  const status=value?.status||'ambiguous';
  try{await audit('editorial',candidate.id,'rpc_result',status,startedAuditId,value?.event_id)}
  catch{return {...report,status:'error',message:'Publication result audit missing; reconcile D06 before any retry'}}
  if(status==='ambiguous')
   return {...report,status:'error',message:'Publication RPC confirmation missing; review audit and D06'};
  report.events.push({item_id:candidate.id,result:status,target_path:value.target_path});
  if(status==='published')report.published++;
  else report.skipped++;
  if(['quota_reached','disabled','sensitive_publication_disabled'].includes(status)){
   if(status==='quota_reached')break;
   if(status==='disabled')return {...report,status:'disabled',message:'Publishing was disabled during execution'};
  }
 }
 // FAQ drafts are user-facing content too. Process via a separate atomic
 // service-role RPC with the SAME combined daily quota and rollback snapshots.
 // Do not publish duplicate questions, incomplete answers, or writing notes.
 if(report.events.some(e=>e.result==='quota_reached')){
  return {...report,status:'completed',message:'The daily limit was reached; remaining items stay queued for the next cycle'};
 }
 for(const draft of faqDrafts){
  if(typeof draft.q==='string'&&excludesFaq(feedback,draft.q)){
   if(!(await recordSkip('faq',draft.q,'reviewer_excluded')))return storageAuditFailure();
   continue;
  }
  if(typeof draft.q!=='string'||typeof draft.a!=='string'||
    draft.q.trim().length<5||draft.a.trim().length<30){
   if(!(await recordSkip('faq',String(draft.q||'unknown'),'invalid_faq_structure')))return storageAuditFailure();
   continue;
  }
  if(competitorDomains===null||!verifier.canProbeAutoPublication({kind:'faq',item:draft})){
   if(!(await recordSkip('faq',draft.q,competitorDomains===null?'source_policy_unavailable':verifier.autoPublicationBlockReason({kind:'faq',item:draft})||'version_or_evidence_not_ready')))return storageAuditFailure();continue;
  }
  if(faqProbes>=2){if(!(await recordSkip('faq',draft.q,'live_probe_budget_reached')))return storageAuditFailure();continue;}
  faqProbes++;
  const receipt=await verifier.liveAutoPublicationReceipt({kind:'faq',item:draft}).catch(()=>null);
  if(!receipt){if(!(await recordSkip('faq',draft.q,'live_exact_proof_not_verified')))return storageAuditFailure();continue;}
  let startedAuditId:string;
  try{startedAuditId=await audit('faq',draft.q,'rpc_started')}
  catch{return storageAuditFailure()}
  let value:{status?:string;target_path?:string;event_id?:string};
  try{
   value=await restCall('rpc/geo_commit_auto_faq',{
    method:'POST',body:{p_question:draft.q,p_expected_draft:draft,p_claim_proofs:receipt.proofs}
   }) as typeof value;
  }catch{
   try{await audit('faq',draft.q,'rpc_result','ambiguous',startedAuditId)}catch{}
   return {...report,status:'error',message:'FAQ RPC outcome ambiguous. Reconcile audit and D06 before retry.'};
  }
  const status=value?.status||'ambiguous';
  try{await audit('faq',draft.q,'rpc_result',status,startedAuditId,value?.event_id)}
  catch{return {...report,status:'error',message:'FAQ result audit missing; reconcile D06 before retry'}}
  if(status==='ambiguous')
   return {...report,status:'error',message:'FAQ RPC confirmation missing; inspect audit and D06'};
  report.events.push({item_id:draft.q,result:status,target_path:value.target_path});
  if(status==='published')report.published++;
  else report.skipped++;
  if(status==='quota_reached')break;
  if(status==='disabled')return {...report,status:'disabled',message:'Publishing was disabled during execution'};
 }
 return {...report,status:'completed',message:report.published?
  'Published visitor-facing items with source status clearly labeled':
  'No item published; see result codes or daily limit for details'};
}
