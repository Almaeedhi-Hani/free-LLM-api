'use strict';

/**
 * Phase 3 preflight, audit-only until Phase-2 exit and policy review.
 * Never approves legal/regulatory/financial/residence content or publishes.
 * Existing source-policy and keyword/draft-quality validators are injected
 * so the database/visitor-facing flows keep their current enforcement.
 */
const crypto=require('node:crypto');
const LANGUAGES=new Set(['ar','en','zh']);
const KINDS=new Set(['faq','editorial','guide']);
const SENSITIVE_CATEGORIES=new Set(['legal','regulatory','financial','residency','immigration','investment_license']);
const MEASUREMENT_TYPES=new Set(['model_only','search_grounded','manual_ai_search']);

function outcome(status,reason,metadata={}) {
  return Object.freeze({status,reason,...metadata,publicationPermission:'unchanged_existing_policy'});
}
function normalizeText(raw) {return typeof raw==='string'?raw.normalize('NFKC').trim():'';}
function safeTimestamp(raw) {
  if(typeof raw!=='string')return null;
  const ms=Date.parse(raw);
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
function fingerprint(input) {
  const text=[input.kind,input.language,normalizeText(input.title),normalizeText(input.body)].join('\n');
  return crypto.createHash('sha256').update(text).digest('hex');
}
function extractUrlStrings(input) {
  const result=new Set();
  for(const value of [input.body,input.copy,input.content]) {
    if(typeof value!=='string')continue;
    for(const match of value.matchAll(/https?:\/\/[^\s"'<>()[\]]+/g))result.add(match[0].replace(/[.,;!?]+$/,''));
  }
  for(const field of ['cited_sources','source_urls','sources']){
    const arr=input[field];
    if(!Array.isArray(arr))continue;
    for(const candidate of arr){
      if(typeof candidate==='string')result.add(candidate);
      else if(candidate&&typeof candidate==='object'&&typeof candidate.url==='string')result.add(candidate.url);
    }
  }
  return [...result];
}
function keywordGate(input,deps) {
  if(!input||!LANGUAGES.has(input.language))return outcome('needs_review','invalid_language');
  if(typeof deps?.assessKeyword!=='function')return outcome('needs_review','keyword_policy_unavailable');
  const assessed=deps.assessKeyword(normalizeText(input.term),input.language);
  const statusMap={accept:'pass_checks',reject:'reject',needs_context:'needs_review',out_of_scope_review:'needs_review'};
  if(!statusMap[assessed?.decision])return outcome('needs_review','unknown_keyword_rule');
  return outcome(statusMap[assessed.decision],assessed.reason||'unspecified_rule',
    {rule:assessed.rule||'unknown',language:input.language,sourceDecision:assessed.decision});
}
function contentGate(input,deps={},seen=new Set()) {
  if(!input||typeof input!=='object'||!KINDS.has(input.kind))
    return outcome('needs_review','unknown_content_kind');
  if(!LANGUAGES.has(input.language))return outcome('needs_review','invalid_language');
  if(!normalizeText(input.title)||!normalizeText(input.body))
    return outcome('needs_review','missing_title_or_visitor_copy');
  if(!input.itemId||typeof input.itemId!=='string')
    return outcome('needs_review','missing_stable_item_id');
  const fp=fingerprint(input);
  if(seen.has(fp))return outcome('needs_review','duplicate_fingerprint',{fingerprint:fp});
  // Do not assume input text is valid: server validator must be present.
  if(typeof deps.validateCopy!=='function')
    return outcome('needs_review','quality_validator_unavailable',{fingerprint:fp});
  let quality;
  try {quality=deps.validateCopy(input);}
  catch{return outcome('needs_review','quality_validator_error',{fingerprint:fp});}
  if(!quality||quality.ok!==true)
    return outcome('needs_review','content_quality_rejected',{fingerprint:fp,qualityCode:quality?.code||'unknown'});
  if(deps.registryVerified!==true||!Array.isArray(deps.competitorDomains)||typeof deps.isCompetitorUrl!=='function')
    return outcome('needs_review','competitor_registry_unverified',{fingerprint:fp});
  const links=extractUrlStrings(input);
  try {
    if(links.some(url=>deps.isCompetitorUrl(url,deps.competitorDomains)))
      return outcome('needs_review','competitor_source_or_body_link',{fingerprint:fp});
  } catch {return outcome('needs_review','competitor_policy_error',{fingerprint:fp});}
  const category=String(input.category||'').toLowerCase();
  // Root AGENTS.md requires qualified human review of sensitive content,
  // irrespective of current automated high-risk publication configuration.
  if(!category||SENSITIVE_CATEGORIES.has(category)||input.riskLevel==='high'||input.requiresQualifiedReview===true)
    return outcome('needs_review',category?'qualified_human_review_required':'unknown_sensitivity',
      {fingerprint:fp});
  seen.add(fp);
  return outcome('pass_checks','deterministic_preflight_passed',{fingerprint:fp});
}
function opportunityGate(input) {
  if(!input||typeof input!=='object'||typeof input.id!=='string'||!input.id.trim())
    return outcome('needs_review','missing_opportunity_id');
  if(!LANGUAGES.has(input.language))return outcome('needs_review','invalid_language');
  const observed=safeTimestamp(input.observedAt);
  if(!observed)return outcome('needs_review','missing_dated_evidence');
  const ageDays=(Date.now()-Date.parse(observed))/86400000;
  if(ageDays<0||ageDays>90)return outcome('needs_review','stale_or_future_evidence');
  // Do not infer organic SERP rank from provider search order.
  if(input.positionSource&&input.positionSource!=='google_search_console'&&input.positionSource!=='verified_serp')
    return outcome('needs_review','unverified_position_source');
  if(typeof input.impressions==='number'&&input.impressions<0)
    return outcome('needs_review','invalid_measured_impressions');
  return outcome('pass_checks','dated_evidence_present',{observedAt:observed});
}
function aiMeasurementGate(input) {
  if(!input||!MEASUREMENT_TYPES.has(input.measurement_type))
    return outcome('needs_review','unknown_measurement_type',{isVerifiedCitation:false});
  if(input.measurement_type==='model_only')
    return outcome('pass_checks','model_only_is_not_search_citation',{isVerifiedCitation:false});
  const validSource=typeof input.source_url==='string'&&/^https:\/\//.test(input.source_url);
  const prompt=normalizeText(input.prompt);
  const date=safeTimestamp(input.observed_at);
  if(!validSource||!prompt||!date)return outcome('needs_review','incomplete_grounded_evidence',{isVerifiedCitation:false});
  return outcome('pass_checks','grounded_evidence_for_manual_verification',
    {isVerifiedCitation:false,sourceType:input.measurement_type,observedAt:date});
}
function batchPreflight({contents=[],keywords=[],opportunities=[],ai=[]},deps) {
  const seen=new Set();
  const out={
    content:contents.map(item=>({itemId:item?.itemId||null,...contentGate(item,deps,seen)})),
    keywords:keywords.map(item=>({term:normalizeText(item?.term),...keywordGate(item,deps)})),
    opportunities:opportunities.map(item=>({id:item?.id||null,...opportunityGate(item)})),
    ai:ai.map(item=>aiMeasurementGate(item)),
  };
  // Report *only* potential removals; never delete/disable any data here.
  return {evaluations:out,would_remove:out.keywords.filter(x=>x.status==='reject').map(x=>({term:x.term,reason:x.reason})),
    summary:Object.fromEntries(Object.entries(out).map(([key,arr])=>[key,{
      checked:arr.length,passed:arr.filter(x=>x.status==='pass_checks').length,
      rejected:arr.filter(x=>x.status==='reject').length,needsReview:arr.filter(x=>x.status==='needs_review').length
    }])),writes:0};
}
module.exports={LANGUAGES,KINDS,SENSITIVE_CATEGORIES,MEASUREMENT_TYPES,extractUrlStrings,keywordGate,contentGate,opportunityGate,aiMeasurementGate,batchPreflight};
