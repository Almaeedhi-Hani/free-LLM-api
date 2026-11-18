import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {runGuardedAutoPublishing} from '@/lib/geo-auto-publication';
export const dynamic='force-dynamic';
// Server-to-server only: the same credential already used by the scheduled
// GEO discovery pipeline. Never accept browser cookies or query-string tokens.
function authorized(req:NextRequest):boolean{
 const secret=process.env.GEO_API_KEY||'';
 const supplied=req.headers.get('x-geo-api-key')||'';
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 return !!secret&&a.length===b.length&&timingSafeEqual(a,b);
}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'unauthorized'},{status:401});
 const result=await runGuardedAutoPublishing(false);
 const failed=result.status==='storage_unavailable'||result.status==='error';
 return NextResponse.json(result,{status:failed?503:200,headers:{'Cache-Control':'no-store'}});
}
