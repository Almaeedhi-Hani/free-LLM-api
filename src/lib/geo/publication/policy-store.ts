import {getSupabaseCredentials} from '../../storage-mode';
import type {Policy} from './types';

export async function restCall(table:string,opts:{method?:'GET'|'POST';body?:unknown}={}):Promise<unknown>{
 const cfg=getSupabaseCredentials();
 if(!cfg)throw Error('storage_not_configured');
 const url=cfg.url.replace(/\/$/,'')+'/rest/v1/'+table;
 const res=await fetch(url,{method:opts.method||'GET',headers:{
  apikey:cfg.key,Authorization:'Bearer '+cfg.key,
  'Content-Type':'application/json',Accept:'application/json'
 },...(opts.body!==undefined?{body:JSON.stringify(opts.body)}:{}),
 cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('auto_publish_storage_'+res.status);
 return res.json();
}
export async function getAutoPublicationStatus():Promise<{
 enabled:boolean;daily_limit:number;allow_high_risk:boolean;events:unknown[];available:boolean
}>{
 try{
  const [policy,editorial,faq]=await Promise.all([
   restCall('geo_publication_settings?select=enabled,daily_limit,allow_high_risk&id=eq.1&limit=1'),
   restCall('geo_publication_events?select=id,item_id,target_path,language,risk_level,status,published_at,rolled_back_at&order=published_at.desc&limit=30'),
   restCall('geo_faq_publication_events?select=id,item_id,risk_level,status,published_at,rolled_back_at&order=published_at.desc&limit=30')
  ]);
  const row=(policy as Policy[])[0];
  if(!row||!Array.isArray(editorial)||!Array.isArray(faq))throw Error('auto_publish_schema_missing');
  const events=[
   ...(editorial as Array<Record<string,unknown>>).map(e=>({...e,kind:'editorial'})),
   ...(faq as Array<Record<string,unknown>>).map(e=>({...e,kind:'faq',target_path:'/'}))
  ].sort((a,b)=>String((b as Record<string,unknown>)['published_at']||'').localeCompare(String((a as Record<string,unknown>)['published_at']||''))).slice(0,30);
  return {enabled:row.enabled===true,allow_high_risk:row.allow_high_risk===true,daily_limit:row.daily_limit,events,available:true};
 }catch{return {enabled:false,allow_high_risk:false,daily_limit:1,events:[],available:false}}
}
/** The admin enable switch is persisted in its own service-only RLS table.
 * Worker and server RPC both read it; admin content GET cannot override it. */
/** Updates the policy with a row-specific PATCH and verifies the server readback. */
export async function saveAutoPublicationSettings(enabled:boolean,dailyLimit:number):Promise<{
 enabled:boolean;daily_limit:number
}>{
 if(!Number.isInteger(dailyLimit)||dailyLimit<1||dailyLimit>3)throw Error('Invalid daily limit (1-3)');
 const cfg=getSupabaseCredentials();
 if(!cfg)throw Error('storage_not_configured');
 const res=await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/geo_publication_settings?id=eq.1',{
  method:'PATCH',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,
   'Content-Type':'application/json',Prefer:'return=representation'},
  body:JSON.stringify({enabled,daily_limit:dailyLimit,updated_at:new Date().toISOString()}),
  cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error('auto_publish_policy_write_'+res.status);
 const rows=await res.json() as Policy[];
 if(!Array.isArray(rows)||rows.length!==1||rows[0].enabled!==enabled||
   rows[0].daily_limit!==dailyLimit)throw Error('auto_publish_policy_confirmation_failed');
 return {enabled:rows[0].enabled,daily_limit:rows[0].daily_limit};
}
/** Separate opt-in for medium/high-risk automated content. Turning the
 * global publisher on does not enable this permission by default.
 */
export async function saveSensitiveAutomaticPermission(allow:boolean):Promise<boolean>{
 const cfg=getSupabaseCredentials();
 if(!cfg)throw Error('storage_not_configured');
 const endpoint=cfg.url.replace(/\/$/,'')+'/rest/v1/geo_publication_settings?id=eq.1';
 const res=await fetch(endpoint,{
  method:'PATCH',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,
   'Content-Type':'application/json',Prefer:'return=representation'},
  body:JSON.stringify({allow_high_risk:allow,updated_at:new Date().toISOString()}),
  cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(!res.ok)throw Error('sensitive_policy_write_'+res.status);
 const rows=await res.json() as Policy[];
 if(!Array.isArray(rows)||rows.length!==1||rows[0].allow_high_risk!==allow)
  throw Error('sensitive_policy_confirmation_failed');
 return rows[0].allow_high_risk;
}
export async function rollbackAutoPublication(eventId:string,kind:'editorial'|'faq'='editorial'):Promise<unknown>{
 if(!/^[a-f0-9-]{36}$/i.test(eventId)||!['editorial','faq'].includes(kind))throw Error('Invalid event ID or type');
 return restCall(kind==='faq'?'rpc/geo_rollback_auto_faq':'rpc/geo_rollback_auto_publication',{
  method:'POST',body:{p_event_id:eventId}});
}
