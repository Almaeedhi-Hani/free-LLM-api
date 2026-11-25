import type {EditorialItem} from '../../editorial-types';

export function officialCandidateUrls(item:Pick<EditorialItem,'evidence_refs'>):string[]{
 const result:string[]=[];
 for(const ref of item.evidence_refs||[]){
  if(!['official_candidate','official-manual'].includes(ref.kind)||typeof ref.url!=='string')continue;
  try{
   const u=new URL(ref.url);
   if(u.protocol!=='https:'||u.username||u.password||u.port||
      !(u.hostname==='gov.sa'||u.hostname.endsWith('.gov.sa')))continue;
   if(!result.includes(u.href))result.push(u.href);
  }catch{}
 }
 return result.slice(0,3);
}
/** Prevent a model from labeling regulated claims LOW-risk to bypass specialist review.
 * This independent, conservative filter is deliberately restrictive; it does
 * not replace factual review and rejects ambiguous language by default. */
export function lowRiskEditorialCopy(item:EditorialItem):boolean{
 const all=[item.title,item.summary,item.body,item.primary_keyword||'',
  ...(item.sections||[]).flatMap(section=>[section.h2,section.body,
   ...(section.subsections||[]).flatMap(part=>[part.h3,part.body])])].join(' ');
 if(all.length<160||all.length>18000)return false;
 if(/(?:licen[sc](?:e|ing)|legal|regulat(?:ion|ory)|government fee|taxation?|corporate tax|ownership|shareholder|bank(?:ing)?|residen(?:ce|cy)|immigration|visa|permit|approval|guaranteed|cost estimate|paid service|service fee|sanction|penalt(?:y|ies)|موافقة|ترخيص|رخصة|نظام|قانون|رسوم|ضريبة|ملكية|إقامة|تأشيرة|حساب بنكي|بنك|许可|执照|法律|税|收费|银行|居留|签证|股东|监管|审批)/i.test(all))return false;
 return true;
}
export type VerifiedOfficialClaimProof={
 url:string;claim:string;quote:string;checked_at:string;
 verified_by:'live_official_exact_quote';
};
/** This is verification of a direct source quotation, not an LLM verdict.
 * All claim references must be in the proposed article and the saved
 * government-source evidence, and two separate official authority domains
 * must each provide matching quotations. Any unavailable source fails closed.
 */
export async function verifyHighRiskOfficialClaims(item:Pick<EditorialItem,'body'|'evidence_refs'|'claim_evidence'>,request:typeof fetch=fetch):
 Promise<{urls:string[];proofs:VerifiedOfficialClaimProof[]}|null>{
 const claims=item.claim_evidence;
 if(!Array.isArray(claims)||claims.length<2||claims.length>10)return null;
 const available=new Set(officialCandidateUrls(item));
 const allText=(item.body||'').replace(/\s+/g,' ').trim().toLocaleLowerCase();
 const pages=new Map<string,string>();
 const urls:string[]=[];
 const proofs:VerifiedOfficialClaimProof[]=[];
 const authorities=new Set<string>();
 const normalized=(text:string)=>text.replace(/\s+/g,' ').trim().toLocaleLowerCase();
 function readableHtml(html:string):string{
  const stripped=html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
   .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
   .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
   .replace(/&apos;|&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
  return normalized(stripped);
 }
 for(const e of claims){
  if(!e||typeof e.url!=='string'||typeof e.claim!=='string'||typeof e.quote!=='string'||
     e.claim.length<25||e.claim.length>450||e.quote.length<28||e.quote.length>500||
     !allText.includes(normalized(e.claim)))return null;
  let u:URL;
  try{u=new URL(e.url)}catch{return null}
  if(u.username||u.password||u.port||u.protocol!=='https:'||
     !(u.hostname==='gov.sa'||u.hostname.endsWith('.gov.sa'))||
     !available.has(u.href))return null;
  if(!pages.has(u.href)){
   try{
    const res=await request(u.href,{method:'GET',cache:'no-store',redirect:'manual',
     headers:{Accept:'text/html'},signal:AbortSignal.timeout(8000)});
    const mime=res.headers?.get('content-type')||'';
    const size=Number(res.headers?.get('content-length')||0);
    if(!res.ok||!/^text\/html(?:;|$)/i.test(mime)||
       (Number.isFinite(size)&&size>600000))return null;
    // Bound the streamed response before decoding (the Content-Length header
    // is optional and cannot be trusted). The text fallback exists only for
    // isolated unit-test Response doubles with no body stream.
    let html:string;
    if(res.body){
     const reader=res.body.getReader(),decoder=new TextDecoder();
     let bytes=0;html='';
     try{while(true){const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;if(bytes>600000){await reader.cancel();return null}
      html+=decoder.decode(value,{stream:true});
     }html+=decoder.decode()}finally{reader.releaseLock()}
    }else html=await res.text();
    if(html.length>600000)return null;
    pages.set(u.href,readableHtml(html));
   }catch{return null}
  }
  if(!pages.get(u.href)?.includes(normalized(e.quote)))return null;
  if(!urls.includes(u.href))urls.push(u.href);
  authorities.add(u.hostname.toLocaleLowerCase().replace(/^www\./,''));
  proofs.push({url:u.href,claim:e.claim,quote:e.quote,
   checked_at:new Date().toISOString(),verified_by:'live_official_exact_quote'});
 }
 if(authorities.size<2||urls.length<2)return null;
 return {urls,proofs};
}
/** HTTP reachability alone is used only for low-risk content, never as evidence
 * supporting sensitive investment or government regulation claims. */
export async function checkOfficialUrlReachable(url:string,request:typeof fetch=fetch):Promise<boolean>{
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.username||u.password||u.port||
     !(u.hostname==='gov.sa'||u.hostname.endsWith('.gov.sa')))return false;
  const res=await request(u.href,{method:'GET',redirect:'manual',
   cache:'no-store',headers:{'Accept':'text/html'},
   signal:AbortSignal.timeout(6500)});
  const type=res.headers?.get('content-type')||'';
  if(!res.ok||!/^text\/html(?:;|$)/i.test(type))return false;
  // Cap stream read to avoid importing an external page or leaking its content.
  await res.body?.cancel();
  return true;
 }catch{return false}
}
