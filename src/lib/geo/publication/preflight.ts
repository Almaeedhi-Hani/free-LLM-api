import type {EditorialItem} from "../../editorial-types";
import {editorialPublicationIssues} from "../../editorial-workflow";
import {assessGeoDraftCopy} from "../../geo-draft-quality";
import {auditBody} from "../../source-policy";
import {officialCandidateUrls,checkOfficialUrlReachable,lowRiskEditorialCopy,verifyHighRiskOfficialClaims} from "./official-evidence";

export type SourceCheck="not_checked"|"no_official_candidates"|"unreachable"|"reachable_only"|"exact_quotes_found"|"quote_check_failed";
export type CandidatePreflight={reason:string;sourceCheck:SourceCheck;candidateCount:number};
export const publicEditorialFields=(item:EditorialItem)=>[item.title,item.summary,item.body,...(Array.isArray(item.sections)?item.sections.flatMap(s=>[s.h2,s.body,...(s.subsections||[]).flatMap(h=>[h.h3,h.body])]):[]),...(item.internal_links||[]).map(l=>l.anchor)].join("\n");
export async function assessEditorialCandidate(item:EditorialItem,domains:string[]|null,checkSources=false,request:typeof fetch=fetch):Promise<CandidatePreflight>{
 const result=(reason:string,sourceCheck:SourceCheck="not_checked",candidateCount=0)=>({reason,sourceCheck,candidateCount});
 if(editorialPublicationIssues(item).length)return result("requires_finished_visitor_copy");
 if(domains===null)return result("source_policy_unavailable");
 if(auditBody(publicEditorialFields(item),domains).length)return result("competitor_link_in_public_copy");
 const urls=officialCandidateUrls(item);
 if(!urls.length)return result("official_source_evidence_missing","no_official_candidates");
 if(!checkSources)return result("source_check_required","not_checked",urls.length);
 // Reachability is distinct from evidence supporting a claim. Never infer a
 // legal conclusion from a URL, a search snippet or an LLM's assertion.
 const reachable=await Promise.all(urls.map(url=>checkOfficialUrlReachable(url,request)));
 if(!reachable.some(Boolean))return result("official_source_unavailable","unreachable",urls.length);
 if(!item.claim_evidence?.length)return result("claim_evidence_missing","reachable_only",urls.length);
 const proof=await verifyHighRiskOfficialClaims(item,request);
 if(!proof)return result("claim_evidence_unverified","quote_check_failed",urls.length);
 // Exact matching quotes are not proof of semantic entailment or coverage of
 // every sentence. Until the coverage and atomic content-version gates are
 // implemented, this path remains closed to unattended publication.
 if(item.risk_level!=="low"||!lowRiskEditorialCopy(item))return result("regulated_copy_not_cleared","exact_quotes_found",urls.length);
 return result("full_claim_coverage_not_verified","exact_quotes_found",urls.length);
}
export function assessFaqCandidate(draft:{q:string;a:string}):string{
 if(!assessGeoDraftCopy(draft.q,draft.a).publishable||editorialPublicationIssues({kind:"guide",body:draft.a,title:draft.q}).length)return "invalid_faq_visitor_copy";
 // The current FAQ schema has no claim-to-source proof contract. Do not
 // publish an answer merely because it is long enough or has a URL.
 return "faq_claim_evidence_missing";
}
