'use strict';
/*
 * Phase 3.5 and 3.6 preview only. No GitHub mutation, no rules activated,
 * no language-agnostic blacklisting and no bypass of qualified human review.
 */
const {createHash}=require('node:crypto');
const MAX_DAILY_TECHNICAL_ISSUES=3;
function clean(value,max=140){
 return typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,max):'';
}
function safeRoute(path) {
 if(typeof path!=='string'||path.length>150)return null;
 if(!/^\/(?:$|(?:en|zh)\/)?(?:services\/[a-z0-9-]+|insights(?:\/[a-z0-9-]+)?|packages)$/.test(path))
   return null;
 return path;
}
function planTechnicalIssues(candidates,{alreadyOpened=[],maxPerUtcDay=MAX_DAILY_TECHNICAL_ISSUES}={}){
 if(!Array.isArray(candidates)||candidates.length>500||!Array.isArray(alreadyOpened))throw Error('Invalid technical input');
 const dailyCap=Math.min(MAX_DAILY_TECHNICAL_ISSUES,Math.max(0,Number.isInteger(maxPerUtcDay)?maxPerUtcDay:0));
 const existing=new Set(alreadyOpened.filter(x=>typeof x==='string'&&x.length===64));
 const planned=[],review=[];
 for(const row of candidates){
  const title=clean(row?.title),target=safeRoute(row?.target_route);
  const quality=String(row?.evidence_status||'');
  // An unsourced idea or provider search suggestion is NOT a measured result.
  if(!title||!target||quality!=='verified_serp'||!row?.observed_at||
    !Number.isFinite(Date.parse(row.observed_at))){
   review.push({reason:'unverified_evidence_or_target',title:title||null});continue;
  }
  const day=new Date(row.observed_at).toISOString().slice(0,10);
  const hash=createHash('sha256').update([title.toLowerCase(),target,day].join('|')).digest('hex');
  if(existing.has(hash)||planned.some(x=>x.fingerprint===hash)){
   review.push({reason:'duplicate_technical_handoff',title});continue;
  }
  if(planned.length>=dailyCap){
   review.push({reason:'daily_technical_issue_cap',title});continue;
  }
  planned.push({title,target_route:target,source:'verified_serp',observed_at:row.observed_at,
    fingerprint:hash,status:'proposal_only',requires_owner_policy_check:true});
 }
 return {planned,review,cap:dailyCap,writes:0};
}
function proposeFeedbackRule(feedback,{
  weeklyOwnerApproval=false,regressionEvalsPassed=false,actualEvidenceReviewed=false
}={}){
 const key=clean(feedback?.subject_key,100);
 const reason=clean(feedback?.reason,180);
 if(!key||!reason||!['keyword','competitor','opportunity','editorial','publication','faq'].includes(feedback?.subject_type))
   return {decision:'invalid_feedback',enabled:false,writes:0};
 if(!weeklyOwnerApproval||!regressionEvalsPassed||!actualEvidenceReviewed){
  return {decision:'await_owner_weekly_review',enabled:false,writes:0,
   required:['weekly_owner_approval','passing_evals','reviewed_evidence']};
 }
 // Even when all decisions are approved, a change needs a separately tested
 // versioned rule and safe migration/integration. No unsafe auto-install.
 return {decision:'ready_for_separate_versioned_rule_pr',enabled:false,writes:0};
}
module.exports={MAX_DAILY_TECHNICAL_ISSUES,planTechnicalIssues,proposeFeedbackRule};
