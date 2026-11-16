import { NextRequest, NextResponse } from 'next/server';
import { getContent, setContent } from '@/lib/content-store';
import {validateEditorialBatch,officialSourceCandidates} from '@/lib/editorial-workflow';
import { assessGeoDraftCopy, splitGeoDraftReviewText } from "@/lib/geo-draft-quality";
import { StorageConflictError, StorageUnavailableError } from '@/lib/storage-mode';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET || process.env.REVALIDATION_SECRET || '';
  const provided = req.headers.get('x-admin-secret') || req.headers.get('x-vercel-revalidation-secret') || '';
  if (!secret) return false; // deny by default when no secret configured
  return provided === secret;
}

function errorResponse(error: unknown) {
  if (error instanceof StorageConflictError) {
    return NextResponse.json(
      { status: 'conflict', message: 'Content changed concurrently. Reload and retry.' },
      { status: 409 }
    );
  }
  if (error instanceof StorageUnavailableError) {
    return NextResponse.json(
      { status: 'storage_unavailable', message: 'Persistent storage is unavailable.' },
      { status: 503 }
    );
  }
  console.error('admin content error:', error);
  return NextResponse.json({ status: 'error', message: 'Request failed.' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  try {
    const content = await getContent();
    return NextResponse.json(content);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ status: 'error', message: 'Invalid content patch' }, { status: 400 });
    }
    const { expectedUpdatedAt, ...patch } = body as Record<string, unknown>;
    if (patch.searchIntegrations !== undefined) {
      const v = patch.searchIntegrations as Record<string, unknown>;
      if (!v || typeof v !== 'object' || Array.isArray(v) ||
        typeof v.googleVerification !== 'string' || !/^[a-zA-Z0-9_-]{0,256}$/.test(v.googleVerification) ||
        typeof v.ga4MeasurementId !== 'string' || !/^(|G-[A-Z0-9]{5,20})$/.test(v.ga4MeasurementId) ||
        typeof v.gscPropertyUrl !== 'string' || v.gscPropertyUrl.length > 512 ||
        (v.gscPropertyUrl !== '' && !/^https:\/\/[^\s]+\/$/.test(v.gscPropertyUrl) && !/^sc-domain:[a-zA-Z0-9.-]+$/.test(v.gscPropertyUrl))) {
        return NextResponse.json({ status: 'error', message: 'Invalid search integration settings' }, { status: 400 });
      }
    }
    if (expectedUpdatedAt !== undefined && (typeof expectedUpdatedAt !== 'string' || !expectedUpdatedAt)) {
      return NextResponse.json({ status: 'error', message: 'Invalid expectedUpdatedAt' }, { status: 400 });
    }
    // Reject only *new* transitions to approved with broken multilingual copy.
    // Existing approved drafts remain readable; editing other admin settings is unaffected.
    if (patch.drafts !== undefined) {
      if (!Array.isArray(patch.drafts))return NextResponse.json({status:'error',message:'Invalid drafts payload'},{status:400});
      const previous=await getContent();
      const byQuestion=new Map(previous.drafts.map(d=>[d.q,d]));
      for(const incoming of patch.drafts as Array<{q?:string;a?:string;status?:string}>){
        if(incoming?.status!=='approved')continue;
        const before=byQuestion.get(incoming.q||'');
        if(before?.status==='approved')continue;
        // No approval may silently publish a different FAQ answer from the
        // exact text reviewed in the draft. Enforce this at the API boundary.
        if(typeof expectedUpdatedAt!=='string'){
          return NextResponse.json({status:'error',message:'Draft approval requires a versioned human review'},{status:400});
        }
        const answer=String(incoming.a||'').trim();
        const note=splitGeoDraftReviewText(answer).note;
        if(note){
          return NextResponse.json({status:'error',message:'Remove the procedural verification note from the final FAQ answer before approval'},{status:422});
        }
        if(!Array.isArray(patch.faqs) ||
           !(patch.faqs as Array<{q?:string;a?:string}>).some(f=>f?.q===incoming.q && f?.a===answer)){
          return NextResponse.json({status:'error',message:'Approved FAQ must exactly match the reviewed draft answer'},{status:422});
        }
        const check=assessGeoDraftCopy(incoming.q||'',answer);
        if(!check.publishable)return NextResponse.json({status:'error',message:'Draft cannot be approved: its language or content quality is invalid'},{status:422});
      }
    }
    if(patch.editorialItems!==undefined){
      if(!expectedUpdatedAt)return NextResponse.json({status:'error',message:'Editorial changes require a versioned admin request'},{status:400});
      try{validateEditorialBatch(patch.editorialItems)}catch(e){return NextResponse.json({status:'error',message:e instanceof Error?e.message:'Invalid editorial content'},{status:422})}
      const before=await getContent();
      const previous=new Map((before.editorialItems||[]).map(x=>[x.id,x]));
      for(const e of patch.editorialItems as Array<{id:string;status:string;title:string;summary:string;body:string}>){
        const p=previous.get(e.id);
        if(!p){
          if(e.status==='approved')return NextResponse.json({status:'error',message:'New editorial items must start in pending review'},{status:422});
          continue;
        }
        if(p.status!=='approved'&&e.status==='approved'){
          if(!(e as any).reviewedAt)
            return NextResponse.json({status:'error',message:'Approval requires explicit human review'},{status:422});
          // The UI discovers government candidates from stored evidence.
          // Enforce the exact same constraint server-side: a competitor/keyword
          // page is never silently promoted into a verified official source.
          const official=officialSourceCandidates((e as any).evidence_refs);
          // Newly supplied official references are accepted only as human-reviewed candidates;
          // the operator must explicitly confirm the evidence in the UI before approval.
          const confirmed=(e as any).verified_sources;
          if(!Array.isArray(confirmed)||!confirmed.length||!official.length||!confirmed.every((url:unknown)=>typeof url==='string'&&official.includes(url)))
            return NextResponse.json({status:'error',message:'Approval requires reviewed official links present in the saved research evidence'},{status:422});
        }
        if(p.status==='approved'&&e.status==='approved'&&(p.title!==e.title||p.body!==e.body||p.summary!==e.summary))
          return NextResponse.json({status:'error',message:'Published changes require review as a new pending revision'},{status:422});
      }
    }
    // Versioned dashboard requests can replace arrays safely; existing agent/API
    // callers without the revision retain additive merge semantics.
    const isVersioned = typeof expectedUpdatedAt === 'string';
    const updated = await setContent(
      patch as Parameters<typeof setContent>[0],
      isVersioned ? { replaceArrays: true, expectedUpdatedAt: expectedUpdatedAt as string } : {}
    );
    return NextResponse.json({ status: 'updated', content: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
