import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {getGeoFeedbackIndex} from '@/lib/geo-agent-feedback';
export const dynamic='force-dynamic';
function authorized(req:NextRequest):boolean{
 const secret=Buffer.from(process.env.GEO_API_KEY||''),provided=Buffer.from(req.headers.get('x-geo-api-key')||'');
 return secret.length>0&&secret.length===provided.length&&timingSafeEqual(secret,provided);
}
/** Limited, read-only copy of active exclusion rules for the GitHub-based GEO runner. */
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const index=await getGeoFeedbackIndex();
  const excluded=Array.from(index.values()).filter(row=>
   row.decision!=='valid'&&['keyword','competitor'].includes(row.subject_type))
   .map(row=>({subject_type:row.subject_type,subject_key:row.subject_key,language:row.language}));
  return NextResponse.json({excluded},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'Reviewer feedback unavailable'},{status:503});
 }
}
