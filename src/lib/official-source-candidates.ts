import type {EditorialRef} from './editorial-types';

/**
 * Finds candidate OFFICIAL government URLs in already saved GEO evidence.
 * This is a URL-domain filter, NOT verification that the page supports a
 * legal/financial claim. An operator must inspect every candidate before
 * confirming publication; no automatic approval is authorized.
 *
 * Only Saudi government .gov.sa domains are allowed. No keyword/competitor
 * citation is automatically treated as governmental just because it was
 * found by a search provider.
 */
export function officialSourceCandidates(refs:readonly EditorialRef[]|undefined):string[]{
 const candidates:string[]=[];
 for(const ref of refs||[]){
  if(!ref||typeof ref.url!=='string')continue;
  try{
   const url=new URL(ref.url);
   const host=url.hostname.toLowerCase();
   if(url.protocol!=='https:'||url.username||url.password||url.port)continue;
   if(!(host==='gov.sa'||host.endsWith('.gov.sa')))continue;
   const normalized=url.href;
   if(!candidates.includes(normalized))candidates.push(normalized);
  }catch{/* skip invalid URLs from untrusted research results */}
 }
 return candidates.slice(0,12);
}
