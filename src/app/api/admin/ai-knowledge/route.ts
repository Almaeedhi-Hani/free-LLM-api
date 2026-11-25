import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {knowledgeMetrics} from '@/lib/llm-knowledge-metrics';
import {feedPaths} from '@/lib/llm-knowledge';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const a=Buffer.from(process.env.ADMIN_SECRET||''),b=Buffer.from(req.headers.get('x-admin-secret')||'');
 if(!a.length||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 const headers={'Cache-Control':'no-store'};
 // Reuse existing AI observation endpoint; no provider calls and no fabricated citations.
 let citations:null|{samples:number;citations:number}=null;
 try{
  const r=await fetch((process.env.SITE_URL||'https://free-llm-api-1-didl.onrender.com').replace(/\/$/,'')+'/api/admin/impact-ai?days=28',{headers:{'x-admin-secret':req.headers.get('x-admin-secret')||''},cache:'no-store',signal:AbortSignal.timeout(5000),redirect:'error'});
  if(r.ok){const d=await r.json();if(Number.isSafeInteger(d.sampleCount)&&Number.isSafeInteger(d.citations))citations={samples:d.sampleCount,citations:d.citations}}
 }catch{}
 return NextResponse.json({metrics:knowledgeMetrics(),feeds:feedPaths,citations},{headers});
}
