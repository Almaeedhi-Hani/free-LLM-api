// Phase 1: retain per-attempt publication provenance in the existing service-only
// audit_logs table. Never store public page bodies, FAQ questions or credentials.
import {createHash} from 'crypto';
import {getSupabaseCredentials} from './storage-mode';

export type PublicationOrigin=Readonly<{
 source_workflow:'W01'|'W03'|'unattributed_api';
 github_run_id:string|null;
 github_run_attempt:number|null;
 event_type:'schedule'|'push'|'workflow_dispatch'|'unattributed_api';
}>;

export const UNATTRIBUTED_PUBLICATION_ORIGIN:PublicationOrigin={
 source_workflow:'unattributed_api',github_run_id:null,
 github_run_attempt:null,event_type:'unattributed_api'
};

export function parsePublicationOrigin(headers:Pick<Headers,'get'>):PublicationOrigin{
 const workflow=headers.get('x-geo-source-workflow');
 const id=headers.get('x-geo-github-run-id');
 const attempt=headers.get('x-geo-github-run-attempt');
 const event=headers.get('x-geo-github-event');
 if(!workflow&&!id&&!attempt&&!event)return UNATTRIBUTED_PUBLICATION_ORIGIN;
 if((workflow!=='W01'&&workflow!=='W03')||!id||!/^\d{1,20}$/.test(id)||
    !attempt||!/^[1-9]\d{0,2}$/.test(attempt)||
    !event||!['schedule','push','workflow_dispatch'].includes(event)||
    (workflow==='W03'&&event==='push'))throw Error('invalid_publication_origin');
 return {source_workflow:workflow,github_run_id:id,
  github_run_attempt:Number(attempt),event_type:event as PublicationOrigin['event_type']};
}

export type AuditPhase='evaluation'|'rpc_started'|'rpc_result';
export type PublicationAuditInput={
 origin:PublicationOrigin;
 kind:'editorial'|'faq';
 itemId:string;
 phase:AuditPhase;
 result?:string;
 startedAuditId?:string;
 publicationEventId?:string;
};

export function publicationAuditPayload(data:PublicationAuditInput){
 const entityId=data.kind==='faq'
  ?'sha256:'+createHash('sha256').update(data.itemId).digest('hex')
  :data.itemId;
 return {
  action:'geo_publication_'+data.phase,
  entity_type:data.kind==='faq'?'geo_faq':'geo_editorial',
  entity_id:entityId,
  actor:'geo_autopublisher',
  metadata:{
   source_workflow:data.origin.source_workflow,
   github_run_id:data.origin.github_run_id,
   github_run_attempt:data.origin.github_run_attempt,
   event_type:data.origin.event_type,
   phase:data.phase,
   ...(data.result?{result:data.result}:{}),
   ...(data.startedAuditId?{started_audit_id:data.startedAuditId}:{}),
   ...(data.publicationEventId?{publication_event_id:data.publicationEventId}:{})
  }
 };
}

export async function appendPublicationAudit(data:PublicationAuditInput):Promise<string>{
 const cfg=getSupabaseCredentials();
 if(!cfg)throw Error('publication_audit_storage_not_configured');
 const res=await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/audit_logs?select=id',{
  method:'POST',
  headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,
   'Content-Type':'application/json',Accept:'application/json',
   Prefer:'return=representation'},
  body:JSON.stringify(publicationAuditPayload(data)),
  cache:'no-store',signal:AbortSignal.timeout(20000)
 });
 if(!res.ok)throw Error('publication_audit_write_'+res.status);
 const payload=await res.json();
 const id=Array.isArray(payload)?payload[0]?.id:undefined;
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))
  throw Error('publication_audit_confirmation_missing');
 return id;
}
