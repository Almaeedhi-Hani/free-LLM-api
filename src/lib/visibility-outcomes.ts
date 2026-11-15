/**
 * Independently measured visibility outcomes. This is a pure calculator, NOT
 * proof that any page is indexed, ranked, cited, recommended or converted.
 * All samples must have verifiable dated sources; empty input = unknown.
 */
export type Locale = "ar" | "en" | "zh";
export type Device = "mobile" | "desktop";
type Base = {
  sample_id: string; observed_at: string; language: Locale;
  country: string; query: string; evidence_url: string;
};
export type VisibilityEvidence =
  | (Base & {kind:"indexing"; page_url:string; source:"gsc_url_inspection"; indexed:boolean; google_canonical:string|null})
  | (Base & {kind:"organic_rank"; page_url:string; source:"manual_organic_serp"; city:string; device:Device; position:number|null; surface:"organic"})
  | (Base & {kind:"ai_citation"; provider:string; answer_url:string; cited_page_url:string|null; cited:boolean; citation_verified:boolean})
  | (Base & {kind:"ai_recommendation"; provider:string; answer_url:string; brand_in_prompt:false; mentioned:boolean; recommended:boolean; recommendation_reason:string|null})
  | (Base & {kind:"qualified_lead"; attribution:"organic"|"ai_referral"|"other"|"unknown"; lead_id:string; qualified:boolean});
export type Rate = {samples:number; successes:number; rate_percent:number|null};
export interface VisibilityScorecard {
  indexing:Rate; organic_first:Rate; ai_citation:Rate; ai_mention:Rate;
  ai_recommendation:Rate; qualified_leads:Rate;
  scope:{country:string|null;language:Locale|null;query:string|null};
}
function validUrl(url:string):boolean {
  try { const parsed=new URL(url);return (parsed.protocol==="https:"||parsed.protocol==="http:")&&Boolean(parsed.hostname); }catch{return false;}
}
function verified(sample:VisibilityEvidence):boolean {
  if(!sample.sample_id.trim() || !sample.query.trim() || !sample.country.trim() || !validUrl(sample.evidence_url))return false;
  if(!Number.isFinite(Date.parse(sample.observed_at)))return false;
  if(!["ar","en","zh"].includes(sample.language))return false;
  switch(sample.kind){
    case "indexing":return sample.source==="gsc_url_inspection" && validUrl(sample.page_url) && (sample.google_canonical===null || validUrl(sample.google_canonical));
    case "organic_rank":return sample.source==="manual_organic_serp" && sample.surface==="organic" && Boolean(sample.city.trim()) && ["mobile","desktop"].includes(sample.device) && validUrl(sample.page_url) && (sample.position===null || (Number.isInteger(sample.position) && sample.position>0));
    case "ai_citation":return validUrl(sample.answer_url) && (sample.cited_page_url===null || validUrl(sample.cited_page_url)) && (!sample.cited || (Boolean(sample.cited_page_url) && sample.citation_verified));
    case "ai_recommendation":return validUrl(sample.answer_url) && sample.brand_in_prompt===false && (!sample.recommended || (sample.mentioned && Boolean(sample.recommendation_reason?.trim())));
    case "qualified_lead":return Boolean(sample.lead_id.trim()) && ["organic","ai_referral","other","unknown"].includes(sample.attribution);
  }
}
const aggregate=(samples:VisibilityEvidence[],predicate:(sample:VisibilityEvidence)=>boolean):Rate=>{
  const successes=samples.filter(predicate).length;
  return {samples:samples.length,successes,rate_percent:samples.length?Math.round(successes*10000/samples.length)/100:null};
};
/** All percentages refer only to explicitly captured samples, never a platform-wide market share. */
export function computeVisibilityScorecard(
  evidence:readonly VisibilityEvidence[],
  scope:{country?:string;language?:Locale;query?:string}={}
):VisibilityScorecard {
  const seen=new Set<string>();
  const filtered=evidence.filter(sample=>{
    if(!verified(sample) || seen.has(sample.sample_id))return false;
    seen.add(sample.sample_id);
    return (!scope.country||scope.country===sample.country) && (!scope.language||scope.language===sample.language) && (!scope.query||scope.query===sample.query);
  });
  const of=<K extends VisibilityEvidence["kind"]>(kind:K)=>filtered.filter(s=>s.kind===kind);
  const rank=of("organic_rank"),citation=of("ai_citation"),recommendation=of("ai_recommendation");
  return {
    indexing:aggregate(of("indexing"),s=>s.kind==="indexing"&&s.indexed),
    organic_first:aggregate(rank,s=>s.kind==="organic_rank"&&s.position===1),
    ai_citation:aggregate(citation,s=>s.kind==="ai_citation"&&s.cited&&s.citation_verified),
    ai_mention:aggregate(recommendation,s=>s.kind==="ai_recommendation"&&s.mentioned),
    ai_recommendation:aggregate(recommendation,s=>s.kind==="ai_recommendation"&&s.recommended),
    qualified_leads:aggregate(of("qualified_lead"),s=>s.kind==="qualified_lead"&&s.qualified),
    scope:{country:scope.country||null,language:scope.language||null,query:scope.query||null},
  };
}
