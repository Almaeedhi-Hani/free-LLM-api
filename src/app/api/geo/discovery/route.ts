import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'crypto';
import {getSupabaseCredentials} from '@/lib/storage-mode';
import {getCompetitor,listKeywords,listObservations,recordObservation,upsertCompetitor,upsertKeyword} from '@/lib/market-intelligence';
import {normalizeGeoDiscoveryBatch,persistGeoDiscoveryBatch} from '@/lib/geo-discovery-batch';

export const dynamic='force-dynamic';

/** Server-to-server ingestion only. This is NOT the manual verified-SERP import. */
function authorized(req:NextRequest):boolean{
 const expected=process.env.GEO_API_KEY||'';
 const supplied=req.headers.get('x-geo-api-key')||'';
 const a=Buffer.from(expected),b=Buffer.from(supplied);
 return !!expected&&a.length===b.length&&timingSafeEqual(a,b);
}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
 if(Number(req.headers.get('content-length')||0)>65536)
  return NextResponse.json({ok:false,error:'Discovery batch too large'},{status:413});
 try{
  if(!getSupabaseCredentials())
   return NextResponse.json({ok:false,error:'Persistent storage is not configured'},{status:503});
 }catch{
  return NextResponse.json({ok:false,error:'Persistent storage is not configured'},{status:503});
 }
 let batch;
 try{
  const body=await req.text();
  if(body.length>65536)return NextResponse.json({ok:false,error:'Discovery batch too large'},{status:413});
  batch=normalizeGeoDiscoveryBatch(JSON.parse(body));
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:'Invalid discovery batch'},{status:422});
 }
 const keywords=new Map<string,Set<string>>();
 let insertedKeywords=0,existingKeywords=0;
 const result=await persistGeoDiscoveryBatch(batch,{
  saveKeyword:async item=>{
   let existing=keywords.get(item.language);
   if(!existing){
    // Preserve manually curated keywords: never overwrite their intent/source/volume.
    existing=new Set((await listKeywords({language:item.language})).map(k=>k.term.trim().toLocaleLowerCase()));
    keywords.set(item.language,existing);
   }
   const normalized=item.term.trim().toLocaleLowerCase();
   if(existing.has(normalized)){existingKeywords++;return;}
   const saved=await upsertKeyword({
    term:item.term,language:item.language,source:'google-suggest',
    volume_confidence:'unknown',search_volume:null,volume_source:null
   });
   if(!saved||saved.language!==item.language||
      saved.term.trim().toLocaleLowerCase()!==normalized)
     throw new Error('Keyword persistence could not be confirmed');
   insertedKeywords++;
   existing.add(normalized);
  },
  saveCandidate:async item=>{
   const domain=new URL(item.url).hostname.toLowerCase().replace(/^www\./,'');
   // A government portal or this site is evidence, not a competing business.
   if(domain==='gov.sa'||domain.endsWith('.gov.sa')||
      domain==='free-llm-api-1-didl.onrender.com')
    throw new Error('Official or self domain cannot be stored as a competitor');
   const existing=await getCompetitor(domain);
   if(existing&&existing.status!=='active')
    throw new Error('Previously excluded competitor requires manual review');
   // Never replace an existing manually reviewed name, status, notes or source.
   const competitor=existing||await upsertCompetitor({
    domain,name:domain,languages:[item.language],source:'search',
    notes:'Unverified GEO discovery candidate; confirm service relevance and organic rank independently.'
   });
   const prior=await listObservations(competitor.id,200);
   const matches=(o:typeof prior[number])=>
    o.language===item.language&&o.query===item.query&&
    // PostgREST may return +00:00 instead of Z for the exact same instant.
    // Compare UTC instants, not timestamp spellings, without weakening provenance checks.
    Number.isFinite(Date.parse(o.observed_at))&&
    Date.parse(o.observed_at)===Date.parse(item.collected_at)&&o.url===item.url&&
    o.rank===null&&o.raw?.source_id===item.source&&
    o.raw?.rank_status==='unverified_provider_order';
   if(prior.some(matches))return;
   const stored=await recordObservation({
    competitor_id:competitor.id,language:item.language,query:item.query,
    observed_at:item.collected_at,url:item.url,title:item.title,snippet:item.snippet,
    rank:null,strengths:[],weaknesses:[],
    raw:{
     source_id:item.source,rank_status:'unverified_provider_order',
     evidence_status:'candidate',collection:'geo_discovery',
     collected_at:item.collected_at
    }
   });
   // Existing unique-index conflicts must not silently count an unrelated row.
   if(!matches(stored))throw new Error('Conflicting observation; source evidence was not confirmed');
  }
 });
 if(!result.ok)console.error('GEO discovery ingestion partial',result.errors.length);
 return NextResponse.json({...result,source:'unverified_geo_discovery',
   keyword_persistence:{inserted:insertedKeywords,existing:existingKeywords}},{
  status:result.ok?200:502,headers:{'Cache-Control':'no-store'}
 });
}
