import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {getAutoPublicationStatus,rollbackAutoPublication,runGuardedAutoPublishing,saveAutoPublicationSettings,saveSensitiveAutomaticPermission} from '@/lib/geo-auto-publication';
export const dynamic='force-dynamic';
const authorized=(req:NextRequest)=>{
 const value=process.env.ADMIN_SECRET||'';
 const provided=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(value),b=Buffer.from(provided);
 return !!value&&a.length===b.length&&timingSafeEqual(a,b);
};
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 const report=await getAutoPublicationStatus();
 return NextResponse.json(report,{status:report.available?200:503,headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 if(Number(req.headers.get('content-length')||0)>10240)
  return NextResponse.json({error:'request_too_large'},{status:413});
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body))
  return NextResponse.json({error:'invalid_request'},{status:400});
 try{
  if(body.action==='configure'){
   if(typeof body.enabled!=='boolean'||!Number.isInteger(body.daily_limit)||
      body.daily_limit<1||body.daily_limit>3 ||
      (body.enabled && body.confirm!=='ENABLE_GUARDED_AUTOMATIC_PUBLICATION'))
     return NextResponse.json({error:'explicit_confirmation_required'},{status:422});
   const status=await saveAutoPublicationSettings(body.enabled,body.daily_limit);
   return NextResponse.json({status:'updated',...status});
  }
  if(body.action==='configure_sensitive'){
   if(typeof body.allow_high_risk!=='boolean'||
      (body.allow_high_risk&&
       (body.confirm!=='ENABLE_AUTONOMOUS_SENSITIVE_CONTENT'||
        body.acknowledge!=='UNDERSTAND_SOURCE_VERIFICATION_LIMITS')))
    return NextResponse.json({error:'explicit_sensitive_content_confirmation_required'},{status:422});
   const allow_high_risk=await saveSensitiveAutomaticPermission(body.allow_high_risk);
   return NextResponse.json({status:'updated',allow_high_risk});
  }
  if(body.action==='dry_run'){
   const result=await runGuardedAutoPublishing(true);
   return NextResponse.json(result,{status:result.status==='storage_unavailable'?503:200});
  }
  if(body.action==='rollback'){
   if(body.confirm!=='ROLLBACK_GEO_PUBLICATION'||typeof body.event_id!=='string')
    return NextResponse.json({error:'explicit_rollback_confirmation_required'},{status:422});
   const result=await rollbackAutoPublication(body.event_id) as {status?:string};
   return NextResponse.json(result,{status:result.status==='rolled_back'?200:409});
  }
  return NextResponse.json({error:'unknown_action'},{status:400});
 }catch(error){
  console.error('geo publication admin operation failed',error instanceof Error?error.message:'unknown');
  return NextResponse.json({error:'publication_operation_failed'},{status:503});
 }
}
