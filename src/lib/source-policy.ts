/** Public citation policy: research evidence and visitor-facing citations are separate. */
export const OFFICIAL_DOMAINS=[
 'misa.gov.sa','mc.gov.sa','zatca.gov.sa','moj.gov.sa','mhrsd.gov.sa',
 'qiwa.sa','my.gov.sa','business.sa','laws.boe.gov.sa',
] as const;
export const FALLBACK_COMPETITOR_DOMAINS=[
 'arablawfirm.org','law.shangiti.com','investmentaxis.com.sa','jewark.com',
] as const;

/** Normalize database domains without treating a path or a lookalike host as a domain. */
export function normalizeCompetitorDomain(raw:unknown):string|null{
 if(typeof raw!=='string'||!raw.trim())return null;
 try{
  const url=new URL(raw.includes('://')?raw:'https://'+raw);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const domain=url.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
  if(domain.length>253||!domain.includes('.')||
     !/^[a-z0-9.-]+$/.test(domain)||domain.includes('..'))return null;
  return domain;
 }catch{return null}
}
export function hostOf(rawUrl:string):string|null{
 try{
  const u=new URL(rawUrl);
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  return u.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
 }catch{return null}
}
const matches=(host:string,domain:string)=>host===domain||host.endsWith('.'+domain);
export function isCompetitorUrl(rawUrl:string,competitorDomains:string[]=[],discoveryType?:string):boolean{
 if(discoveryType==='competitor_candidate')return true;
 const host=hostOf(rawUrl);
 if(!host)return false;
 return [...competitorDomains,...FALLBACK_COMPETITOR_DOMAINS].some(raw=>{
  const domain=normalizeCompetitorDomain(raw);
  return domain!==null&&matches(host,domain);
 });
}
export function isWhitelistedOfficial(rawUrl:string,competitorDomains:string[]=[]):boolean{
 const host=hostOf(rawUrl);
 return !!host&&!isCompetitorUrl(rawUrl,competitorDomains)&&
  OFFICIAL_DOMAINS.some(domain=>matches(host,domain));
}
export function isDisplayable(rawUrl:string,competitorDomains:string[]=[],discoveryType?:string):boolean{
 return !!hostOf(rawUrl)&&!isCompetitorUrl(rawUrl,competitorDomains,discoveryType);
}
/** Read-only audit; content and its stored research evidence are never erased. */
export function extractLinks(body:string):string[]{
 const result=new Set<string>();
 for(const m of String(body||'').matchAll(/https?:\/\/[^\s)"'<>\]]+/gi)){
  result.add(m[0].replace(/[.,;!?]+$/,''));
 }
 return [...result];
}
export function auditBody(body:string,competitorDomains:string[]):string[]{
 return extractLinks(body).filter(url=>isCompetitorUrl(url,competitorDomains));
}
