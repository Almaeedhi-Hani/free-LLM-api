import type {GscSyncDayRecord} from './gsc-backfill-plan';

/** Supabase REST adapter; only a service-role key may access the RPCs. */
export type DailyGscMeasurement={
 dimension:'total'|'query'|'page'|'country'|'device'|'page_query';
 dimension_value:string;clicks:number;impressions:number;ctr:number;position:number;
};
export type DailyGscWrite={
 property:string;outcome:GscSyncDayRecord;measurements:DailyGscMeasurement[];
};
export type GscStorageConfig={url:string;key:string;request?:typeof fetch};

function assertConfig(cfg:GscStorageConfig):void{
 if(!/^https:\/\/[a-z0-9.-]+$/i.test(cfg.url.replace(/\/$/,''))||!cfg.key)
  throw Error('gsc_atomic_storage_not_configured');
}
function safeJsonResult(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw Error('gsc_atomic_bad_response');
 return value as Record<string,unknown>;
}
export function createGscAtomicStore(cfg:GscStorageConfig){
 assertConfig(cfg);
 const request=cfg.request||fetch;
 const root=cfg.url.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:cfg.key,Authorization:'Bearer '+cfg.key,
  Accept:'application/json','Content-Type':'application/json'};
 const read=async(url:string):Promise<unknown>=>{
  const response=await request(url,{method:'GET',headers,cache:'no-store',
   signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('gsc_atomic_read_'+response.status);
  return response.json();
 };
 const rpc=async(name:string,payload:unknown):Promise<Record<string,unknown>>=>{
  const response=await request(root+'rpc/'+name,{method:'POST',headers,cache:'no-store',
   signal:AbortSignal.timeout(90000),body:JSON.stringify(payload)});
  // No retry: database commit may have succeeded before a network timeout.
  if(!response.ok)throw Error('gsc_atomic_rpc_'+name+'_'+response.status);
  return safeJsonResult(await response.json());
 };
 return {
  async getHistory(property:string):Promise<GscSyncDayRecord[]>{
   if(!property||property.length>500)throw Error('gsc_property_invalid');
   const suffix='gsc_sync_day_outcomes?select=metric_date,status,checked_at,rows_fetched,attempts'+
     '&property=eq.'+encodeURIComponent(property)+'&order=metric_date.desc&limit=90';
   const result=await read(root+suffix);
   if(!Array.isArray(result)||result.length>90)throw Error('gsc_atomic_bad_history');
   return result as GscSyncDayRecord[];
  },
  async commitDay(write:DailyGscWrite):Promise<void>{
   const out=await rpc('gsc_sync_commit_day_v2',{
    p_property:write.property,p_date:write.outcome.metric_date,
    p_status:write.outcome.status,p_checked_at:write.outcome.checked_at,
    p_attempts:write.outcome.attempts,p_rows:write.measurements
   });
   if(out.status!==write.outcome.status||out.stored!==write.measurements.length||
      out.attempts!==write.outcome.attempts)throw Error('gsc_atomic_commit_ack_mismatch');
  },
  async readDay(write:DailyGscWrite):Promise<{outcome:GscSyncDayRecord|null;matchingMeasurements:number}>{
   const out=await rpc('gsc_sync_verify_day_v2',{
    p_property:write.property,p_date:write.outcome.metric_date,
    p_expected_rows:write.measurements
   });
   if(out.outcome!==null&&(!out.outcome||typeof out.outcome!=='object'||Array.isArray(out.outcome)))
    throw Error('gsc_atomic_readback_bad_outcome');
   if(!Number.isSafeInteger(out.matchingMeasurements)||Number(out.matchingMeasurements)<0)
    throw Error('gsc_atomic_readback_bad_count');
   return {outcome:(out.outcome as GscSyncDayRecord|null)||null,
    matchingMeasurements:Number(out.matchingMeasurements)};
  }
 };
}
