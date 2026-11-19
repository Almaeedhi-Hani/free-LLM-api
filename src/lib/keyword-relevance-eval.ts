/** V3 relevance classifier: advisory evaluation only until reviewed patterns are approved. */
export type KeywordLanguage='ar'|'en'|'zh';
export type KeywordDecision='accept'|'reject'|'needs_context'|'out_of_scope_review';
export type KeywordAssessment={
 decision:KeywordDecision;reason:string;language:KeywordLanguage;rule:string;
};
const clean=(raw:string)=>String(raw||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
/** Explicit sports, employment, and unrelated commemorative-intent signals. */
const offDomain=/(?:\bfootball\b|\bworld\s*cup\b|\bformation\s*day\b|\bapply\s+(?:to\s+)?aramco\b|\bjobs?\b|كرة\s*القدم|كأس\s*العالم|منتخب|يوم\s*التأسيس|وظائف|足球|世界杯|招聘)/i;
const needsReview=/(?:\bcompany\s+logo\b|\btrademark\b|شعار|علامة\s*تجارية|商标)/i;
/** Commercial *intent*, not a bare "company" match. */
const businessIntent=/(?:\bforeign\s+(?:company|investor)\b|\bcompany\s+(?:registration|formation|setup|incorporation)\b|\bksa\s+company\b|\bregister\s+(?:a\s+)?company\b|\bbusiness\s+(?:registration|setup)\b|\bmisa\b|\bllc\b|\binvestment\s+licen[sc]\w*\b|\bsaudi\s+(?:investor|incorporation|company\s+registration)\b|تأسيس\s+شرك|شركة|مستثمر|استثمار\s*أجنبي|ترخيص\s*استثمار|公司注册|设立公司|外资|投资许可证)/i;
const unclearFormation=/(?:\bformation\b|تأسيس|\bcompany\b|公司)/i;
export function assessKeyword(term:string,language:KeywordLanguage):KeywordAssessment{
 if(!['ar','en','zh'].includes(language))throw Error('Unsupported keyword language');
 const value=clean(term);
 if(!value)return {decision:'needs_context',reason:'empty_query',language,rule:'empty'};
 if(offDomain.test(value))return {decision:'reject',reason:'off_domain: sports, jobs, or commemorative intent',language,rule:'explicit_off_domain'};
 // Company logo / trademark could become a commercial service later: review, do not blacklist.
 if(needsReview.test(value))return {decision:'out_of_scope_review',reason:'service_scope_not_approved',language,rule:'future_service_review'};
 if(businessIntent.test(value))return {decision:'accept',reason:'specific_investor_business_intent',language,rule:'business_intent'};
 if(unclearFormation.test(value))return {decision:'needs_context',reason:'formation_or_company_without_business_context',language,rule:'ambiguous_formation'};
 return {decision:'reject',reason:'off_domain: no investor-service context',language,rule:'no_business_intent'};
}
