import {getSupabaseCredentials,resolveStorageMode,StorageUnavailableError} from './storage-mode';

/** Persistent, append-only operator corrections, not training-data fine-tuning. */
export type FeedbackSubject='keyword'|'competitor'|'opportunity'|'editorial'|'publication'|'faq';
export type FeedbackDecision='irrelevant'|'inaccurate'|'duplicate'|'valid';
export type GeoFeedback={
 id:string;subject_type:FeedbackSubject;subject_key:string;language:'ar'|'en'|'zh'|null;
 decision:FeedbackDecision;reason:string;source:'admin'|'seed';created_at:string;
};
export type FeedbackIndex=Map<string,GeoFeedback>;
const subjectTypes=new Set<FeedbackSubject>(['keyword','competitor','opportunity','editorial','publication','faq']);
const decisions=new Set<FeedbackDecision>(['irrelevant','inaccurate','duplicate','valid']);
const rejected=new Set<FeedbackDecision>(['irrelevant','inaccurate','duplicate']);
const host=(value:string):string=>{
 try{const u=new URL(value.includes('://')?value:'https://'+value);
  return u.hostname.toLowerCase().replace(/^www\./,'');}catch{return value.trim().toLowerCase().replace(/^www\./,'')}
};
export function feedbackKey(type:FeedbackSubject,raw:string):string{
 const value=String(raw||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
 if(type==='competitor')return host(value);
 if(type==='publication')return (value.startsWith('/')?value:'/'+value).replace(/\/+$/,'')||'/';
 return value;
}
export const identity=(type:FeedbackSubject,key:string,lang?:string|null)=>[type,feedbackKey(type,key),lang||'*'].join('|');
const undoPrefix='[operator-undo] ';
export function isUndo(row:GeoFeedback):boolean{return row.decision==='valid'&&row.source==='admin'&&row.reason.startsWith(undoPrefix)}
export function effectiveFeedback(rows:GeoFeedback[]):FeedbackIndex{
 const index:FeedbackIndex=new Map();
 const seen=new Set<string>();
 // SQL returns newest first; latest correction of one identity is authoritative.
 for(const row of [...rows].sort((a,b)=>
  b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))){
  const k=identity(row.subject_type,row.subject_key,row.language);
  if(seen.has(k))continue;
  seen.add(k);
  if(!isUndo(row))index.set(k,row);
 }
 return index;
}
export function isExcluded(index:FeedbackIndex,type:FeedbackSubject,key:string,lang?:string|null):boolean{
 const normalized=feedbackKey(type,key);
 const row=index.get(identity(type,normalized,lang))||index.get(identity(type,normalized,null));
 return !!row&&rejected.has(row.decision);
}
export function inferFeedbackLanguage(value:string):'ar'|'en'|'zh'{
 if(/[\u0600-\u06ff]/.test(value))return 'ar';
 if(/[\u3400-\u9fff]/.test(value))return 'zh';
 return 'en';
}
function containsPhrase(text:string,phrase:string):boolean{
 const normalized=' '+feedbackKey('keyword',text)+' ';
 return normalized.includes(' '+phrase+' ');
}
/** Read-only application of exact reviewer terms, not broad fuzzy blacklisting. */
export function containsRejectedKeyword(index:FeedbackIndex,texts:string[]):boolean{
 return Array.from(index.values()).some(row=>row.subject_type==='keyword'&&rejected.has(row.decision)&&
  texts.some(text=>typeof text==='string'&&containsPhrase(text,row.subject_key)));
}
export function excludesOpportunity(index:FeedbackIndex,item:{title:string;related_keywords?:string[]}):boolean{
 return isExcluded(index,'opportunity',item.title,inferFeedbackLanguage(item.title))||
  containsRejectedKeyword(index,[item.title,...(item.related_keywords||[])]);
}
export function excludesEditorial(index:FeedbackIndex,item:{
 id?:string;slug?:string;target?:string;lang?:'ar'|'en'|'zh';title?:string;primary_keyword?:string;
 secondary_keywords?:string[];evidence_refs?:Array<{url?:string;kind?:string}>;
},path?:string):boolean{
 const route=path||('/insights/'+(item.slug||''));
 return (!!item.id&&isExcluded(index,'editorial',item.id,item.lang))||
  (!!item.title&&isExcluded(index,'editorial','title:'+item.title,item.lang))||
  isExcluded(index,'publication',route,item.lang)||
  containsRejectedKeyword(index,[item.title||'',item.primary_keyword||'',...(item.secondary_keywords||[])])||
  (item.evidence_refs||[]).some(ref=>!!ref.url&&isExcluded(index,'competitor',ref.url,item.lang));
}
export function excludesFaq(index:FeedbackIndex,question:string):boolean{
 return isExcluded(index,'faq',question,inferFeedbackLanguage(question))||
  containsRejectedKeyword(index,[question]);
}
export function validateFeedback(raw:unknown):{
 subject_type:FeedbackSubject;subject_key:string;language:'ar'|'en'|'zh'|null;
 decision:FeedbackDecision;reason:string;source:'admin';
}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid correction');
 const v=raw as Record<string,unknown>;
 if(!subjectTypes.has(v.subject_type as FeedbackSubject)||
    !decisions.has(v.decision as FeedbackDecision)||
    typeof v.subject_key!=='string')throw Error('Invalid subject or decision');
 const type=v.subject_type as FeedbackSubject,key=feedbackKey(type,v.subject_key);
 const language=v.language===null||v.language===''||v.language===undefined?null:v.language;
 if(typeof key!=='string'||key.length<2||key.length>500||
    (language!==null&&!['ar','en','zh'].includes(String(language)))||
    typeof v.reason!=='string'||v.reason.trim().startsWith(undoPrefix)||v.reason.trim().length<5||v.reason.trim().length>1000)
  throw Error('Subject, language or explanation invalid');
 return {subject_type:type,subject_key:key,
  language:language as 'ar'|'en'|'zh'|null,decision:v.decision as FeedbackDecision,
  reason:v.reason.trim(),source:'admin'};
}
async function feedbackFetch(suffix:string,method:'GET'|'POST'='GET',body?:unknown):Promise<GeoFeedback[]>{
 const cfg=getSupabaseCredentials();
 if(!cfg){
  if(resolveStorageMode()==='file'&&method==='GET')return [];
  throw Error('Persistent feedback storage unavailable');
 }
 const res=await fetch(cfg.url+'/rest/v1/geo_agent_feedback'+suffix,{
  method,cache:'no-store',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,
  Accept:'application/json','Content-Type':'application/json',
  ...(method==='POST'?{Prefer:'return=representation'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error('Feedback storage unavailable ('+res.status+')');
 const rows=await res.json();
 if(!Array.isArray(rows))throw Error('Feedback response invalid');
 return rows as GeoFeedback[];
}
/** Fetch all recent corrections from protected, service-role-only Supabase storage. */
export async function listGeoFeedback(limit=Number.MAX_SAFE_INTEGER):Promise<GeoFeedback[]>{
 const result:GeoFeedback[]=[];
 const bounded=Math.max(1,Math.trunc(limit));
 while(result.length<bounded){
  const page=await feedbackFetch('?select=id,subject_type,subject_key,language,decision,reason,source,created_at&order=created_at.desc,id.desc&offset='+result.length+'&limit='+Math.min(500,bounded-result.length));
  if(!page.length)break;
  result.push(...page);
 }
 return result;
}
export async function getGeoFeedbackIndex():Promise<FeedbackIndex>{
 return effectiveFeedback(await listGeoFeedback());
}
export async function appendGeoFeedback(payload:unknown):Promise<GeoFeedback>{
 const item=validateFeedback(payload);
 const previous=effectiveFeedback(await listGeoFeedback()).get(identity(item.subject_type,item.subject_key,item.language));
 if(previous) throw Error('Feedback already active');
 const saved=await feedbackFetch('', 'POST', item);
 if(saved.length!==1||saved[0].subject_key!==item.subject_key||
    saved[0].decision!==item.decision)throw Error('Feedback persistence unconfirmed');
 return saved[0];
}

/** Append a reversible audit event using the existing valid decision constraint. */
export async function undoGeoFeedback(id:string):Promise<GeoFeedback>{
 const current=Array.from(effectiveFeedback(await listGeoFeedback()).values()).find(x=>x.id===id);
 if(!current)throw Error('Feedback is not active');
 const {subject_type,subject_key,language}=current;
 const saved=await feedbackFetch('','POST',{subject_type,subject_key,language,decision:'valid',reason:undoPrefix+id,source:'admin'});
 if(saved.length!==1||!isUndo(saved[0]))throw Error('Feedback undo unconfirmed');
 return saved[0];
}

/** Preserve the exact removed record before deletion. This is reusable feedback,
 * not model fine-tuning. The existing ingestion and publication guards consume it. */
export async function rememberGeoDeletion(kind:'editorial'|'faq',key:string,language:'ar'|'en'|'zh',snapshot:unknown,exclusions:Array<{subject_type:FeedbackSubject;subject_key:string}>){
 const cfg=getSupabaseCredentials();
 if(!cfg)throw new StorageUnavailableError('Deletion requires persistent feedback storage');
 const reason='Removed by the administrator; do not regenerate this exact content or republish the removed item. The removal does not establish factual inaccuracy.';
 const audit=await fetch(cfg.url+'/rest/v1/audit_logs?select=id',{
  method:'POST',cache:'no-store',signal:AbortSignal.timeout(15000),
  headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json',Accept:'application/json',Prefer:'return=representation'},
  body:JSON.stringify({action:'geo_content_deleted_feedback',entity_type:kind==='faq'?'geo_faq':'geo_editorial',entity_id:key,actor:'admin',metadata:{snapshot,language,reason,phase:'before_deletion'}})
 });
 if(!audit.ok)throw new StorageUnavailableError('Deletion snapshot was not saved');
 const saved=await audit.json();
 if(!Array.isArray(saved)||saved.length!==1||typeof saved[0]?.id!=='string')throw new StorageUnavailableError('Deletion snapshot unconfirmed');
 let index=await getGeoFeedbackIndex();
 for(const exclusion of exclusions){
  if(isExcluded(index,exclusion.subject_type,exclusion.subject_key,language))continue;
  const row=validateFeedback({...exclusion,language,decision:'irrelevant',reason});
  const receipt=await feedbackFetch('','POST',row);
  if(receipt.length!==1||receipt[0].subject_key!==row.subject_key||receipt[0].decision!==row.decision)throw new StorageUnavailableError('Deletion feedback unconfirmed');
  index=await getGeoFeedbackIndex();
  if(!isExcluded(index,row.subject_type,row.subject_key,language))throw new StorageUnavailableError('Deletion feedback readback failed');
 }
 return saved[0].id as string;
}
