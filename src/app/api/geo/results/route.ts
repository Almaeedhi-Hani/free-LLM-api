import { NextRequest, NextResponse } from "next/server";
import { getContent, setContent, type ContentDraft } from "@/lib/content-store";
import { createOpportunity, createGoal, detectLanguage } from "@/lib/market-intelligence";
import { normalizeGeoBatch, persistGeoBatch } from "@/lib/geo-ingest";
import { validateGeoDrafts } from "@/lib/geo-draft-quality";
import {validateEditorialItem} from "@/lib/editorial-workflow";
import { getSupabaseCredentials } from "@/lib/storage-mode";
import { getGeoFeedbackIndex,isExcluded,containsRejectedKeyword,excludesOpportunity,excludesEditorial,excludesFaq } from "@/lib/geo-agent-feedback";
import {editorialPath} from '@/lib/content-impact';

export const dynamic = "force-dynamic";
// This route is authenticated separately from admin APIs; GEO_API_KEY is never sent to a browser.
function authorized(req:NextRequest):boolean {
 const secret=process.env.GEO_API_KEY||"";
 const supplied=req.headers.get("x-geo-api-key")||"";
 if(!secret||secret.length!==supplied.length)return false;
 let diff=0;for(let i=0;i<secret.length;i++)diff|=secret.charCodeAt(i)^supplied.charCodeAt(i);
 return diff===0;
}
export async function POST(req:NextRequest) {
 if(!authorized(req))return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 if(!getSupabaseCredentials())return NextResponse.json({ok:false,error:"Persistent Supabase storage not configured"},{status:503});
 let batch;
 try{batch=normalizeGeoBatch(await req.json())}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Bad JSON"},{status:422})}
 let memory;
 try{memory=await getGeoFeedbackIndex()}catch{
  return NextResponse.json({ok:false,error:"Reviewer feedback unavailable"},{status:503});
 }
 const previous={
  opportunities:batch.opportunities?.length||0,goals:batch.goals?.length||0,
  drafts:batch.drafts?.length||0,editorial_actions:batch.editorial_actions?.length||0
 };
 batch={
  ...batch,
  opportunities:batch.opportunities?.filter(o=>!excludesOpportunity(memory,o)),
  goals:batch.goals?.filter(g=>!isExcluded(memory,'opportunity',g.title)&&
   !containsRejectedKeyword(memory,[g.title,g.description||'',g.related_opportunity||''])),
  drafts:batch.drafts?.filter(d=>!excludesFaq(memory,d.q)),
  editorial_actions:batch.editorial_actions?.filter(e=>!excludesEditorial(memory,e,editorialPath(e)||undefined))
 };
 const excluded={
  opportunities:previous.opportunities-(batch.opportunities?.length||0),
  goals:previous.goals-(batch.goals?.length||0),
  drafts:previous.drafts-(batch.drafts?.length||0),
  editorial_actions:previous.editorial_actions-(batch.editorial_actions?.length||0)
 };
 const outcome=await persistGeoBatch(batch,{
  saveOpportunity:async o=>{
   await createOpportunity({
    title:o.title, type:o.type==="keyword"?"keyword_gap":"content_gap",
    score:o.score,confidence:"low",languages:[detectLanguage(o.title)],
    evidence:[],related_keywords:[],related_competitors:[],
    estimated_impact:"Unverified AI suggestion; editorial and source review required"
   });
  },
  saveGoal:async g=>{
   await createGoal({
    title:g.title,priority:g.priority,description:g.description||"OpenCode candidate; human and evidence review required",
    evidence:[],success_metrics:[],confidence:"low"
   });
  },
  saveDrafts:async drafts=>{
   validateGeoDrafts(drafts);
   const before=await getContent();
   const reviewed=new Set(before.drafts.filter(d=>d.status==="approved"||d.status==="rejected").map(d=>d.q));
   const incoming:ContentDraft[]=drafts.filter(d=>!reviewed.has(d.q)).map(d=>({
    q:d.q,a:d.a,createdAt:new Date().toISOString(),status:"pending" as const,risk_level:d.risk_level,evidence_ids:d.evidence_ids||[],evidence_refs:d.evidence_refs||[],...(d.claim_evidence!==undefined?{claim_evidence:d.claim_evidence}:{})
   }));
   const after=incoming.length?await setContent({drafts:incoming}):before;
   // Confirm that each draft is stored, including already-reviewed duplicates.
   const count=drafts.filter(d=>after.drafts.some(s=>s.q===d.q)).length;
   return count;
  },
  saveEditorial:async items=>{
   const now=new Date().toISOString();
   const incoming=items.map(e=>validateEditorialItem({...e,status:'pending',reviewedAt:undefined,verified_sources:undefined,createdAt:now}));
   const after=await setContent({editorialItems:incoming});
   return incoming.filter(e=>after.editorialItems?.some(a=>a.id===e.id)).length;
  },
  saveReport:async report=>{
   await setContent({agent:{
    lastRun:report.run_at,
    status:report.status==="success"?"success":"error",
    lastResult:report.last_result
   }});
  }
 });
 if(!outcome.ok)console.error("GEO ingestion was partial",outcome.errors);
 return NextResponse.json({...outcome,reviewer_excluded:excluded},{status:outcome.ok?200:502});
}
