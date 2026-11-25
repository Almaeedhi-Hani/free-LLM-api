import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {knowledgeMetrics} from '@/lib/llm-knowledge-metrics';
import {feedPaths} from '@/lib/llm-knowledge';
import {getSupabaseCredentials} from '@/lib/storage-mode';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const a=Buffer.from(process.env.ADMIN_SECRET||''),b=Buffer.from(req.headers.get('x-admin-secret')||'');
 if(!a.length||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 const headers={'Cache-Control':'no-store'};
 // Same stored, bounded observation source as the existing impact report.
 let citations:null|{samples:number;citations:number}=null;
 try{
  const cfg=getSupabaseCredentials();
  if(cfg){
   const q=new URLSearchParams({select:'result',observed_at:'gte.'+new Date(Date.now()-28*86400000).toISOString(),verification_status:'eq.manual_documented',order:'observed_at.desc',limit:'200'});
   const r=await fetch(cfg.url+'/rest/v1/impact_ai_observations?'+q,{headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(r.ok){const rows=await r.json();if(Array.isArray(rows)&&rows.length<200)citations={samples:rows.length,citations:rows.filter(x=>x.result==='cited').length}}
  }
 }catch{}
 return NextResponse.json({metrics:knowledgeMetrics(),feeds:feedPaths,citations},{headers});
}
