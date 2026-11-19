import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {analyzeAiCitationPanel} from '@/lib/ai-citation-radar';
import {getCompetitorDomains} from '@/lib/source-policy-store';
export const dynamic='force-dynamic';

/** Human-reviewed observations only; no AI search calls, generated answers or paid APIs. */
function isAdmin(req:NextRequest):boolean{
 const secret=process.env.ADMIN_SECRET||'';
 const presented=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(secret),b=Buffer.from(presented);
 return !!secret&&a.length===b.length&&timingSafeEqual(a,b);
}
function profileOf(value:unknown):string{
 if(typeof value!=='string'||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value))
  throw Error('invalid_sampling_profile');
 return value;
}
function siteHost():string{
 const property=process.env.GSC_PROPERTY_URL||'https://free-llm-api-1-didl.onrender.com/';
 if(property.startsWith('sc-domain:'))return property.slice(10).toLowerCase();
 return new URL(property).hostname.toLowerCase();
}
function settings(url:string,key:string){
 return {root:url.replace(/\/$/,'')+'/rest/v1/',headers:{
  apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',
  Accept:'application/json'}};
}
function panel(profile:string,competitor_hosts:string[],from:string,until:string){
 return {sampling_profile:profile,site_hosts:[siteHost()],
  competitor_hosts,from,until};
}
async function dependencies(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('storage_not_configured');
 const competitor_hosts=await getCompetitorDomains();
 return {...settings(url,key),competitor_hosts};
}
export async function GET(req:NextRequest){
 if(!isAdmin(req))return NextResponse.json({error:'unauthorized'},{status:401});
 try{
  const profile=profileOf(req.nextUrl.searchParams.get('profile')||'sa-desktop-fresh');
  const now=Date.now();
  const from=req.nextUrl.searchParams.get('from')||
    new Date(now-30*86400000).toISOString();
  const until=req.nextUrl.searchParams.get('until')||
    new Date(now+60000).toISOString();
  const fromMs=Date.parse(from),untilMs=Date.parse(until);
  if(!Number.isFinite(fromMs)||!Number.isFinite(untilMs)||
     fromMs>=untilMs||untilMs-fromMs>180*86400000||
     untilMs>now+5*60000)throw Error('invalid_ai_panel_window');
  const {root,headers,competitor_hosts}=await dependencies();
  const endpoint=root+'ai_citation_panel_observations?select=observation'+
   '&observed_at=gte.'+encodeURIComponent(from)+
   '&observed_at=lt.'+encodeURIComponent(until)+
   '&order=observed_at.asc&limit=1001';
  const response=await fetch(endpoint,{headers,cache:'no-store',
   signal:AbortSignal.timeout(20000)});
  if(!response.ok){
   if(response.status===404)return NextResponse.json({
    status:'evidence_storage_pending',samples:0,search_visibility:null,
    message:'AI evidence table not yet authorized/applied'
   },{headers:{'Cache-Control':'no-store'}});
   throw Error('ai_evidence_read_'+response.status);
  }
  const rows=await response.json() as Array<{observation:unknown}>;
  if(!Array.isArray(rows)||rows.length>1000)throw Error('ai_evidence_sample_ceiling');
  const result=analyzeAiCitationPanel({panel:panel(profile,competitor_hosts,from,until),
   observations:rows.map(row=>row.observation)});
  return NextResponse.json({status:'reviewed_observations_only',...result,
   checked_at:new Date().toISOString()},
   {headers:{'Cache-Control':'no-store'}});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:'ai_evidence_unavailable'},
   {status:502,headers:{'Cache-Control':'no-store'}});
 }
}
export async function POST(req:NextRequest){
 if(!isAdmin(req))return NextResponse.json({error:'unauthorized'},{status:401});
 if(process.env.AI_CITATION_CAPTURE_ENABLED!=='true')
  return NextResponse.json({error:'reviewed_capture_not_enabled'},{status:409});
 try{
  const body=await req.json() as {observation?:unknown};
  if(!body||typeof body!=='object'||!body.observation||typeof body.observation!=='object')
   throw Error('invalid_evidence_record');
  const observation=body.observation as Record<string,unknown>;
  const profile=profileOf(observation.sampling_profile);
  const now=Date.now(),from=new Date(now-180*86400000).toISOString(),
   until=new Date(now+60000).toISOString();
  const {root,headers,competitor_hosts}=await dependencies();
  const check=analyzeAiCitationPanel({
   panel:panel(profile,competitor_hosts,from,until),observations:[observation]
  });
  if(check.valid_samples!==1||check.rejected_samples!==0)
   return NextResponse.json({error:'evidence_not_reviewed_or_invalid'},{status:422});
  // Evidence is operator-attested, not automatically independently corroborated.
  const row={provider:observation.provider,prompt_id:observation.prompt_id,
   measurement_type:observation.measurement_type,
   observed_at:observation.observed_at,
   answer_evidence_url:observation.answer_evidence_url,
   observation};
  const response=await fetch(root+'ai_citation_panel_observations',{
   method:'POST',headers:{...headers,Prefer:'return=representation'},
   body:JSON.stringify(row),cache:'no-store',signal:AbortSignal.timeout(20000)
  });
  if(response.status===409)return NextResponse.json({error:'duplicate_evidence'},{status:409});
  if(!response.ok)throw Error('ai_evidence_write_'+response.status);
  const saved=await response.json() as Array<{id:string}>;
  if(!Array.isArray(saved)||saved.length!==1||!saved[0].id)
   throw Error('ai_evidence_write_unconfirmed');
  return NextResponse.json({status:'stored_for_reviewed_panel',id:saved[0].id},
   {status:201,headers:{'Cache-Control':'no-store'}});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:'ai_evidence_unavailable'},
   {status:502,headers:{'Cache-Control':'no-store'}});
 }
}
