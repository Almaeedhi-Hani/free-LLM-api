import {getContent} from './content-store';
import {editorialPath} from './content-impact';
import {editorialPublicationIssues,validateEditorialItem} from './editorial-workflow';
import {getSupabaseCredentials} from './storage-mode';
import type {EditorialItem} from './editorial-types';

type Policy={enabled:boolean;daily_limit:number;allow_high_risk:boolean};
export type AutoPublishReport={
 status:'disabled'|'dry_run'|'completed'|'storage_unavailable'|'error';
 examined:number;published:number;skipped:number;
 events:Array<{item_id:string;result:string;target_path?:string}>;
 message:string;
};
export function officialCandidateUrls(item:EditorialItem):string[]{
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
export async function verifyHighRiskOfficialClaims(item:EditorialItem,request:typeof fetch=fetch):
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
    const html=await res.text();
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
async function restCall(table:string,opts:{method?:'GET'|'POST';body?:unknown}={}):Promise<unknown>{
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
  ].sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||''))).slice(0,30);
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
/** HTTPS research links are recorded transparently as unverified citations;
 * no minimum number, specific host, provider or official domain is required. */
export function optionalResearchCitations(item:EditorialItem):string[]{
 const urls:string[]=[];
 for(const ref of item.evidence_refs||[]){
  if(typeof ref?.url!=='string')continue;
  try{
   const u=new URL(ref.url);
   if(u.protocol!=='https:'||u.username||u.password||u.port||
      u.hash||u.hostname.length>250||!/^[-a-z0-9.]+$/i.test(u.hostname))continue;
   if(!urls.includes(ref.url))urls.push(ref.url);
  }catch{}
 }
 return urls.slice(0,12);
}
const publishableKinds=new Set(['guide','comparison','home','trust','service','packages']);
const unfinished=(x:EditorialItem)=>editorialPublicationIssues(x).length>0;
export async function runGuardedAutoPublishing(dryRun=false):Promise<AutoPublishReport>{
 const report:AutoPublishReport={status:'disabled',examined:0,published:0,skipped:0,events:[],message:''};
 const state=await getAutoPublicationStatus();
 if(!state.available)return {...report,status:'storage_unavailable',message:'Publication migration or storage unavailable'};
 if(!state.enabled)return {...report,status:'disabled',message:'Automatic publication is not enabled'};
 let content;
 try{content=await getContent()}catch{
  return {...report,status:'storage_unavailable',message:'Cannot load saved content'};
 }
 const editorial=(content.editorialItems||[]).filter(e=>e.status==='pending');
 const faqDrafts=(content.drafts||[]).filter(d=>d.status==='pending');
 report.examined=editorial.length+faqDrafts.length;
 const publishable=editorial.filter(e=>publishableKinds.has(e.kind));
 if(dryRun){
  const pending=publishable.filter(e=>e.risk_level!=='low'&&!state.allow_high_risk);
  const unfinishedItems=publishable.filter(unfinished);
  return {...report,status:'dry_run',message:JSON.stringify({
   pending_editorial:editorial.length,pending_faq:faqDrafts.length,
   visitor_page_candidates:publishable.length,
   source_requirement:'optional',high_risk_permission:state.allow_high_risk,
   needs_finished_copy:unfinishedItems.length,
   sensitive_permission_not_enabled:pending.length,
   technical_tasks:editorial.length-publishable.length,
   dry_run_only:true
  })};
 }
 // Existing DB quota governs the combined publication count, with strict
 // transactional locks. Never retry ambiguous writes.
 for(const candidate of publishable){
  const path=editorialPath(candidate);
  if(!path||unfinished(candidate)){
   report.skipped++;
   report.events.push({item_id:candidate.id,result:'requires_finished_visitor_copy'});
   continue;
  }
  const cited=optionalResearchCitations(candidate);
  try{
   validateEditorialItem({...candidate,status:'approved',
    reviewedAt:new Date().toISOString(),approval_method:'automated',
    verified_sources:[],cited_sources:cited});
  }catch{
   report.skipped++;
   report.events.push({item_id:candidate.id,result:'invalid_publication_structure'});
   continue;
  }
  try{
   const value=await restCall('rpc/geo_commit_auto_publication',{
    method:'POST',body:{p_item_id:candidate.id,p_verified_urls:cited,p_claim_proofs:[]}
   }) as {status?:string;target_path?:string};
   if(!value?.status)throw Error('ambiguous_write_confirmation');
   report.events.push({item_id:candidate.id,result:value.status,target_path:value.target_path});
   if(value.status==='published')report.published++;
   else report.skipped++;
   if(['quota_reached','disabled','sensitive_publication_disabled'].includes(value.status)){
    if(value.status==='quota_reached')break;
    if(value.status==='disabled')return {...report,status:'disabled',message:'Publishing was disabled during execution'};
   }
  }catch{
   return {...report,status:'error',message:'Publication write outcome unclear. Review the audit log before any retry.'};
  }
 }
 // FAQ drafts are user-facing content too. Process via a separate atomic
 // service-role RPC with the SAME combined daily quota and rollback snapshots.
 // Do not publish duplicate questions, incomplete answers, or writing notes.
 if(report.events.some(e=>e.result==='quota_reached')){
  return {...report,status:'completed',message:'The daily limit was reached; remaining items stay queued for the next cycle'};
 }
 for(const draft of faqDrafts){
  if(typeof draft.q!=='string'||typeof draft.a!=='string'||
    draft.q.trim().length<5||draft.a.trim().length<30){
   report.skipped++;
   report.events.push({item_id:draft.q||'unknown',result:'invalid_faq_structure'});
   continue;
  }
  try{
   const value=await restCall('rpc/geo_commit_auto_faq',{
    method:'POST',body:{p_question:draft.q}
   }) as {status?:string;target_path?:string};
   if(!value?.status)throw Error('ambiguous_faq_write_confirmation');
   report.events.push({item_id:draft.q,result:value.status,target_path:value.target_path});
   if(value.status==='published')report.published++;
   else report.skipped++;
   if(value.status==='quota_reached')break;
  }catch{
   return {...report,status:'error',message:'FAQ publication outcome ambiguous. Inspect audit log; do not retry blindly.'};
  }
 }
 return {...report,status:'completed',message:report.published?
  'Published visitor-facing items with source status clearly labeled; no mandatory government citation requirement':
  'No item published; see result codes or daily limit for details'};
}
