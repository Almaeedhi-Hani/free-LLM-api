/**
 * Phase 3.1–3.3 PREVIEW ONLY: reuse already approved keyword, source and
 * editorial quality contracts. Does not write Supabase, approve content,
 * change publication policy or contact an AI/search provider.
 *
 * A pass is eligibility for the EXISTING policy, never automatic publication.
 */
import { assessKeyword, type KeywordLanguage } from './keyword-relevance-eval';
import { assessGeoDraftCopy } from './geo-draft-quality';
import { validateEditorialItem } from './editorial-workflow';
import { auditBody, isCompetitorUrl } from './source-policy';
import type { EditorialItem } from './editorial-types';

export type PreviewDecision = 'eligible_for_existing_policy' | 'needs_review' | 'reject';
export type PreviewResult = {
  decision: PreviewDecision; reasons: string[]; requires_human_review: boolean;
};
type KeywordRow = { term:string; language:KeywordLanguage };
type DraftRow = { q:string; a:string };
function cleanReasons(values:string[]):string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0,12);
}
function guardedError(error: unknown):string {
  // Sanitize internal validation text; do not include draft content or private URLs.
  const message=error instanceof Error?error.message:'unknown_validation_error';
  return /[a-z][a-z -]{1,90}/i.test(message)?'invalid_editorial_contract':'unknown_validation_error';
}
export function previewKeyword(rows:readonly KeywordRow[]) {
  if(!Array.isArray(rows)||rows.length>1000)throw Error('keyword_preview_size');
  const items=rows.map(row=>{
    const result=assessKeyword(row.term,row.language);
    return {
      language:result.language,
      decision:result.decision,
      reason:result.reason,
      rule:result.rule,
      needs_review:result.decision==='out_of_scope_review'||result.decision==='needs_context',
    };
  });
  return {
    items, would_remove:items.filter(x=>x.decision==='reject').length,
    review_count:items.filter(x=>x.needs_review).length,
    applied:false, storage_mutated:false,
  };
}
export function previewFaq(rows:readonly DraftRow[]):PreviewResult[] {
  if(!Array.isArray(rows)||rows.length>1000)throw Error('faq_preview_size');
  const seen=new Set<string>();
  return rows.map(row=>{
    const assessment=assessGeoDraftCopy(String(row.q||''),String(row.a||''));
    const key=String(row.q||'').trim().normalize('NFKC').toLowerCase();
    const reasons=[...assessment.issues];
    if(seen.has(key))reasons.push('duplicate_question_in_batch');
    if(key)seen.add(key);
    return {
      decision:reasons.length?'needs_review':'eligible_for_existing_policy',
      reasons:cleanReasons(reasons),
      // Legal/regulatory/financial/residence-related questions must continue
      // through an appropriately qualified human reviewer per root AGENTS.md.
      requires_human_review:true,
    };
  });
}
export function previewEditorial(rows:readonly unknown[],competitorDomains:readonly string[]=[]):PreviewResult[] {
  if(!Array.isArray(rows)||rows.length>1000)throw Error('editorial_preview_size');
  const safeDomains=competitorDomains.slice(0,250).filter(x=>typeof x==='string'&&x.length<254);
  return rows.map(raw=>{
    let item:EditorialItem;
    try{item=validateEditorialItem(raw);}
    catch(error){return {decision:'needs_review',reasons:[guardedError(error)],requires_human_review:true};}
    const reasons:string[]=[];
    if(auditBody(item.body+'\n'+item.summary+'\n'+item.title,safeDomains).length)
      reasons.push('competitor_link_in_public_copy');
    // Competitor research references are allowed internally, but never
    // elevated into the public cited/verified-source list.
    const citations=[...(item.verified_sources||[]),...(item.cited_sources||[])];
    if(citations.some(url=>isCompetitorUrl(url,safeDomains)))
      reasons.push('competitor_in_public_citations');
    if(item.status==='pending'&&item.risk_level==='high')
      reasons.push('high_risk_human_review');
    return {
      decision:reasons.length?'needs_review':'eligible_for_existing_policy',
      reasons:cleanReasons(reasons),
      requires_human_review:true,
    };
  });
}
