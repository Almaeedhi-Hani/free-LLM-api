import type {EditorialClaimEvidence,EditorialRef} from './editorial-types';
/** Pending claim mapping is provenance, not independent fact verification. */
const normalized=(value:string)=>value.normalize('NFC').replace(/\s+/gu,' ').trim();
export function normalizeClaimEvidence(raw:unknown,copy:string,refs:readonly Pick<EditorialRef,'url'|'kind'>[]):EditorialClaimEvidence[]|undefined{
 if(raw===undefined)return undefined;
 if(!Array.isArray(raw)||raw.length>10)throw Error('Invalid claim evidence');
 const urls=new Set(refs.filter(r=>['official_candidate','official-manual'].includes(r.kind)).map(r=>r.url));
 return raw.map(e=>{
  if(!e||typeof e.claim!=='string'||typeof e.quote!=='string'||typeof e.url!=='string'||e.claim.length<25||e.claim.length>450||e.quote.length<28||e.quote.length>500||!normalized(copy).includes(normalized(e.claim))||!urls.has(e.url))throw Error('Invalid claim evidence mapping');
  const u=new URL(e.url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!(u.hostname==='gov.sa'||u.hostname.endsWith('.gov.sa')))throw Error('Invalid official claim evidence URL');
  return {claim:normalized(e.claim),quote:normalized(e.quote),url:u.href};
 });
}
/** Conservative exact-text coverage. A paraphrase or translated claim is not
 * independently supported solely because a related quotation was observed. */
export function exactClaimCoverage(fields:readonly string[],proofs:readonly EditorialClaimEvidence[]){
 const normalize=(s:string)=>normalized(s).replace(/[.!?。！？؟]+$/u,'').trim();
 const parts=fields.flatMap(s=>s.split(/(?<=[.!?。！？؟])\s*|\n+/u)).map(normalize).filter(Boolean);
 const unique=[...new Set(parts)];
 const matched=unique.filter(part=>proofs.some(p=>normalize(p.claim)===part&&normalize(p.quote)===part)).length;
 return {total:unique.length,matched,complete:unique.length>0&&matched===unique.length};
}
