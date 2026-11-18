import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {getContent} from '@/lib/content-store';
import {getSupabaseCredentials} from '@/lib/storage-mode';
export const dynamic='force-dynamic';
const repo='Almaeedhi-Hani/free-LLM-api';
function authorized(req:NextRequest):boolean{
 const expected=process.env.ADMIN_SECRET||'';
 const supplied=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(expected),b=Buffer.from(supplied);
 return !!expected&&a.length===b.length&&timingSafeEqual(a,b);
}
function credentials(){
 const cfg=getSupabaseCredentials();
 if(!cfg)throw Error('storage_not_configured');
 return {url:cfg.url.replace(/\/$/,'')+'/rest/v1/geo_technical_task_handoffs',
  headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json'}};
}
async function readRows(){
 const c=credentials();
 const res=await fetch(c.url+'?select=item_id,kind,title,status,github_issue_number,github_issue_url,failure_code,created_at,updated_at&order=updated_at.desc&limit=100',{
  headers:c.headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw Error('task_store_'+res.status);
 const rows:unknown=await res.json();
 if(!Array.isArray(rows)||rows.length>=100)throw Error('task_list_invalid_or_truncated');
 return rows;
}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 try{return NextResponse.json({status:'available',tasks:await readRows()},
   {headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({status:'unavailable',tasks:[],error:'technical_handoffs_unavailable'},{status:503})}
}
/** Explicit operator handoff only. Issues need coding work, code review, CI and
 * a verified deploy. This route cannot pretend an editorial proposal was implemented. */
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 if(Number(req.headers.get('content-length')||0)>1800)
  return NextResponse.json({error:'request_too_large'},{status:413});
 const data=await req.json().catch(()=>null);
 const id=data?.item_id;
 if(!data||data.confirm!=='CREATE_GEO_TECHNICAL_ISSUE'||
  typeof id!=='string'||id.length<8||id.length>128)
  return NextResponse.json({error:'explicit_confirmation_required'},{status:422});
 const token=(process.env.GEO_GITHUB_TOKEN||'').trim();
 if(!token)return NextResponse.json({error:'github_issues_token_not_configured'},{status:503});
 let item;
 try{const content=await getContent();item=content.editorialItems.find(x=>x.id===id)}
 catch{return NextResponse.json({error:'editorial_storage_unavailable'},{status:503})}
 if(!item||!['technical_seo','internal_link'].includes(item.kind)||item.status!=='pending')
  return NextResponse.json({error:'not_a_pending_technical_task'},{status:422});
 let cfg:ReturnType<typeof credentials>;
 try{cfg=credentials()}catch{return NextResponse.json({error:'handoff_storage_unavailable'},{status:503})}
 // Unique DB reservation before any potentially non-idempotent GitHub POST.
 // If confirmation fails, do not retry automatically or fabricate a link.
 let reserved;
 try{
  reserved=await fetch(cfg.url,{
   method:'POST',cache:'no-store',signal:AbortSignal.timeout(12000),
   headers:{...cfg.headers,Prefer:'return=representation'},
   body:JSON.stringify({item_id:id,kind:item.kind,title:item.title.slice(0,300),status:'queued'})
  });
  if(reserved.status===409)return NextResponse.json({error:'task_handoff_already_exists'},{status:409});
  if(!reserved.ok)throw Error('reserve_'+reserved.status);
  const rows=await reserved.json();
  if(!Array.isArray(rows)||rows.length!==1||rows[0].item_id!==id)throw Error('reserve_not_confirmed');
 }catch{
  return NextResponse.json({error:'task_handoff_reservation_not_confirmed_no_retry'},{status:503});
 }
 const issueBody=[
  '## GEO technical implementation handoff (operator requested)',
  'Editorial task ID: '+id,
  'Task type: '+item.kind,
  'Language: '+item.lang,
  'Target: '+item.target,
  'Related service: '+(item.related_service||'—'),
  '',
  '## Proposed change',
  item.summary.slice(0,850),
  '',
  item.body.slice(0,2800),
  '',
  '## Acceptance criteria',
  '- Check the existing production implementation; do not regenerate the platform from scratch.',
  '- Implement only validated technical SEO/internal-link improvements via a focused pull request.',
  '- Include automated regression and verify no regressions in AR/EN/ZH, canonicals and internal links.',
  '- Preserve existing prices, approved content, publication policy, RLS, credentials and unrelated workflows.',
  '- Reference this issue in the PR and require green CI. Verify deployed Render revision before marking complete.',
  '- Do not claim this editorial suggestion was implemented merely because an issue exists.'
 ].join('\n');
 let issueNumber:number,issueUrl:string;
 try{
  const response=await fetch('https://api.github.com/repos/'+repo+'/issues',{
   method:'POST',cache:'no-store',signal:AbortSignal.timeout(18000),
   headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
   body:JSON.stringify({title:'[GEO technical] '+item.title.slice(0,180),body:issueBody})
  });
  if(response.status!==201)throw Error('github_issue_creation_'+response.status);
  const issue=await response.json();
  issueNumber=issue.number;
  issueUrl=issue.html_url;
  if(!Number.isInteger(issueNumber)||issueNumber<=0||
    issueUrl!=='https://github.com/'+repo+'/issues/'+issueNumber)
   throw Error('github_issue_response_unverified');
 }catch(error){
  // A failed or ambiguous GitHub response is NOT safe to retry blindly:
  // an issue may have been created even if the response was lost.
  try{await fetch(cfg.url+'?item_id=eq.'+encodeURIComponent(id),{
   method:'PATCH',headers:{...cfg.headers,Prefer:'return=minimal'},
   body:JSON.stringify({status:'blocked',failure_code:error instanceof Error?error.message.slice(0,100):'unconfirmed',updated_at:new Date().toISOString()}),
   cache:'no-store',signal:AbortSignal.timeout(8000)})}catch{}
  return NextResponse.json({error:'github_issue_not_confirmed_no_retry',
   message:'لم يتأكد إنشاء التذكرة، راجع سجل GitHub قبل محاولة جديدة.'},{status:503});
 }
 try{
  const saved=await fetch(cfg.url+'?item_id=eq.'+encodeURIComponent(id),{
   method:'PATCH',cache:'no-store',signal:AbortSignal.timeout(12000),
   headers:{...cfg.headers,Prefer:'return=representation'},
   body:JSON.stringify({status:'issue_open',github_issue_number:issueNumber,
    github_issue_url:issueUrl,updated_at:new Date().toISOString(),failure_code:null})
  });
  if(!saved.ok)throw Error('save_'+saved.status);
  const rows=await saved.json();
  if(!Array.isArray(rows)||rows.length!==1||rows[0].github_issue_number!==issueNumber)
   throw Error('save_not_confirmed');
  return NextResponse.json({status:'issue_open',item_id:id,issue_number:issueNumber,issue_url:issueUrl},
   {headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'github_issue_created_but_audit_link_unconfirmed',
   issue_url:issueUrl,message:'التذكرة موجودة في GitHub، لكن حفظ رابطها في سجل الإدارة لم يتأكد؛ راجع التذكرة يدويًا.'},
   {status:503});
 }
}
