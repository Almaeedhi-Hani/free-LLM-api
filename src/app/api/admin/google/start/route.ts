import {NextRequest,NextResponse} from 'next/server';
import {randomBytes,timingSafeEqual} from 'crypto';
export const dynamic='force-dynamic';
const origin='https://free-llm-api-1-didl.onrender.com';
export async function POST(req:NextRequest){
 const expected=process.env.ADMIN_SECRET||'';
 const given=req.headers.get('x-admin-secret')||'';
 const a=Buffer.from(expected),b=Buffer.from(given);
 if(!expected||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Unauthorized'},{status:401});
 const id=process.env.GSC_CLIENT_ID,secret=process.env.GSC_CLIENT_SECRET;
 if(!id||!secret)return NextResponse.json({error:'Google OAuth credentials are not configured'},{status:503});
 const state=randomBytes(32).toString('hex');
 const redirectUri=origin+'/api/admin/google/callback';
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:id,redirect_uri:redirectUri,response_type:'code',scope:'https://www.googleapis.com/auth/webmasters.readonly',access_type:'offline',prompt:'consent',state}).toString();
 const res=NextResponse.json({authorizationUrl:url.toString()});
 res.cookies.set('gsc_oauth_state',state,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/google/callback',maxAge:600});
 return res;
}
