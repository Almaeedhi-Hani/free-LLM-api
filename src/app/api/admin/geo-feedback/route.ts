import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {appendGeoFeedback,listGeoFeedback,effectiveFeedback} from '@/lib/geo-agent-feedback';

export const dynamic='force-dynamic';
function authorized(req:NextRequest):boolean{
 const actual=(req.headers.get('x-admin-secret')||'').trim();
 if(!actual)return false;
 const supplied=Buffer.from(actual);
 return [process.env.ADMIN_SECRET,process.env.CRON_SECRET,process.env.REVALIDATION_SECRET]
  .filter((v):v is string=>!!v?.trim())
  .some(value=>{const expected=Buffer.from(value.trim());return expected.length===supplied.length&&timingSafeEqual(expected,supplied)});
}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const history=await listGeoFeedback();
  const latest=Array.from(effectiveFeedback(history).values());
  return NextResponse.json({history,latest,count:history.length},
   {headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'Cannot read feedback history'},{status:503});
 }
}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(Number(req.headers.get('content-length')||0)>4000)
  return NextResponse.json({error:'Feedback payload too large'},{status:413});
 try{
  const body=await req.text();
  if(body.length>4000)return NextResponse.json({error:'Feedback payload too large'},{status:413});
  const saved=await appendGeoFeedback(JSON.parse(body));
  return NextResponse.json({feedback:saved,saved:true},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const bad=e instanceof SyntaxError||Boolean(e instanceof Error&&
    /Invalid|invalid|explanation|Subject|subject|decision/.test(e.message));
  return NextResponse.json({error:bad?'Invalid feedback decision or reason':'Feedback write unavailable'},
   {status:bad?422:503});
 }
}
