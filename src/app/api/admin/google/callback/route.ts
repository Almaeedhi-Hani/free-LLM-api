import {NextRequest,NextResponse} from 'next/server';
import {createCipheriv,createHash,randomBytes,timingSafeEqual} from 'crypto';
export const dynamic='force-dynamic';
const ORIGIN='https://free-llm-api-1-didl.onrender.com';
function error(message:string){return new NextResponse(message,{status:400,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})}
export async function GET(req:NextRequest){
 const state=req.nextUrl.searchParams.get('state')||'';
 const expected=req.cookies.get('gsc_oauth_state')?.value||'';
 if(!state||!expected||state.length!==expected.length||!timingSafeEqual(Buffer.from(state),Buffer.from(expected)))return error('Invalid or expired OAuth state. Restart connection from the admin dashboard.');
 const code=req.nextUrl.searchParams.get('code');
 if(!code)return error('Google authorization was cancelled or returned no code.');
 const id=process.env.GSC_CLIENT_ID,secret=process.env.GSC_CLIENT_SECRET,adminSecret=process.env.ADMIN_SECRET;
 if(!id||!secret||!adminSecret)return error('OAuth server configuration incomplete.');
 try{
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:id,client_secret:secret,redirect_uri:ORIGIN+'/api/admin/google/callback',grant_type:'authorization_code'}),cache:'no-store'});
  if(!response.ok)return error('Google token exchange failed. Check redirect URI and OAuth test users.');
  const tokens=await response.json() as {refresh_token?:string};
  if(!tokens.refresh_token)return error('Google did not provide offline access. Revoke prior consent and reconnect.');
  const key=createHash('sha256').update(adminSecret).digest();
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(tokens.refresh_token,'utf8'),cipher.final()]);
  const value=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
  const result=NextResponse.redirect(ORIGIN+'/admin/dashboard?gsc=connected');
  result.cookies.set('gsc_refresh',value,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/visibility',maxAge:60*60*24*30});
  result.cookies.set('gsc_oauth_state','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/google/callback',maxAge:0});
  result.headers.set('Cache-Control','no-store');
  return result;
 }catch{return error('Unable to complete Google authorization.')}
}
