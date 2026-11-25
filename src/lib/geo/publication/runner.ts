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
import {optionalResearchCitations} from './citations';
import type {AutoPublishReport} from './types';

const publishableKinds=new Set(['guide','comparison','home','trust','service','packages']);
const unfinished=(x:EditorialItem)=>editorialPublicationIssues(x).length>0;
export async function runGuardedAutoPublishing(dryRun=false,origin:PublicationOrigin=UNATTRIBUTED_PUBLICATION_ORIGIN):Promise<AutoPublishReport>{
 const report:AutoPublishReport={status:'disabled',examined:0,published:0,skipped:0,events:[],message:''};
 const state=await getAutoPublicationStatus();
 if(!state.available)return {...report,status:'storage_unavailable',message:'Publication migration or storage unavailable'};
 if(!state.enabled)return {...report,status:'disabled',message:'Automatic publication is not enabled'};
 let content;
 try{content=await getContent()}catch{
  return {...report,status:'storage_unavailable',message:'Cannot load saved content'};
 }
 // A missing/failed feedback store must not silently publish a rejected topic.
 let feedback;
 try{feedback=await getGeoFeedbackIndex()}catch{
  return {...report,status:'storage_unavailable',message:'Reviewer feedback could not be loaded'};
 }
 // If the live competitor registry is unavailable, publish without external citations;
 // do not make optional sources into a new mandatory publication gate.
 const competitorDomains=await getCompetitorDomains().catch(()=>null);
 const editorial=(content.editorialItems||[]).filter(e=>e.status==='pending');
 const faqDrafts=(content.drafts||[]).filter(d=>d.status==='pending');
 report.examined=editorial.length+faqDrafts.length;
 const publishable=editorial.filter(e=>publishableKinds.has(e.kind));
 if(dryRun){
  const pending=publishable.filter(e=>e.risk_level!=='low'&&!state.allow_high_risk);
  const unfinishedItems=publishable.filter(unfinished);
  return {...report,status:'dry_run',message:JSON.stringify({
   pending_editorial:editorial.length,pending_faq:faqDrafts.length,
   visitor_page_candidates:publishable.length,
   source_requirement:'optional',high_risk_permission:state.allow_high_risk,
   needs_finished_copy:unfinishedItems.length,
   sensitive_permission_not_enabled:pending.length,
   technical_tasks:editorial.length-publishable.length,
   dry_run_only:true
  })};
 }
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
  const cited=competitorDomains===null?[]:optionalResearchCitations(candidate,competitorDomains);
  if(competitorDomains!==null){
   const bodyLinks=auditBody(candidate.body||'',competitorDomains);
   if(bodyLinks.length)console.warn('geo_publication_competitor_body_audit',{
    item_id:candidate.id,count:bodyLinks.length
   });
  }
  try{
   validateEditorialItem({...candidate,status:'approved',
    reviewedAt:new Date().toISOString(),approval_method:'automated',
    verified_sources:[],cited_sources:cited});
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
    method:'POST',body:{p_item_id:candidate.id,p_verified_urls:cited,p_claim_proofs:[]}
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
  let startedAuditId:string;
  try{startedAuditId=await audit('faq',draft.q,'rpc_started')}
  catch{return storageAuditFailure()}
  let value:{status?:string;target_path?:string;event_id?:string};
  try{
   value=await restCall('rpc/geo_commit_auto_faq',{
    method:'POST',body:{p_question:draft.q}
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
 }
 return {...report,status:'completed',message:report.published?
  'Published visitor-facing items with source status clearly labeled; no mandatory government citation requirement':
  'No item published; see result codes or daily limit for details'};
}
