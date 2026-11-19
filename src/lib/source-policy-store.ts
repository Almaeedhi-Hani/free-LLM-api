import {getSupabaseCredentials} from './storage-mode';
import {normalizeCompetitorDomain} from './source-policy';

/** Load the live competition list per request/run. Fail closed at call sites if unavailable. */
export async function getCompetitorDomains(request:typeof fetch=fetch):Promise<string[]>{
 const cfg=getSupabaseCredentials();
 if(!cfg)throw Error('competitor_source_storage_unavailable');
 const url=cfg.url.replace(/\/$/,'')+
  '/rest/v1/competitors?select=domain&status=eq.active&limit=1000';
 const response=await request(url,{
  method:'GET',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,
   Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error('competitor_source_read_'+response.status);
 const rows:unknown=await response.json();
 if(!Array.isArray(rows)||rows.length>=1000)throw Error('competitor_source_incomplete');
 const domains=new Set<string>();
 for(const row of rows){
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('competitor_source_invalid');
  const domain=normalizeCompetitorDomain((row as {domain?:unknown}).domain);
  if(!domain)throw Error('competitor_domain_invalid');
  domains.add(domain);
 }
 return [...domains];
}
