import { NextRequest, NextResponse } from 'next/server';
import { getContent, setContent } from '@/lib/content-store';
import {validateEditorialBatch,validateEditorialItem,officialSourceCandidates,editorialPublicationIssues} from '@/lib/editorial-workflow';
import { assessGeoDraftCopy, splitGeoDraftReviewText } from "@/lib/geo-draft-quality";
import { StorageConflictError, StorageUnavailableError } from '@/lib/storage-mode';
import {rememberGeoDeletion,inferFeedbackLanguage} from '@/lib/geo-agent-feedback';
import {editorialPath} from '@/lib/content-impact';
import {approvedEditorial} from '@/lib/editorial-workflow';
import {editorialReviewIdentity,faqReviewIdentity,recordReview} from '@/lib/admin-content-review';
import {normalizeWhatsAppNumber,validWhatsAppAdvisorField} from '@/lib/whatsapp-contacts';

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
    return NextResponse.json({ status: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const content = await getContent();
    return NextResponse.json(content, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ status: 'error', message: 'Invalid content patch' }, { status: 400 });
    }
    const { expectedUpdatedAt, ...patch } = body as Record<string, unknown>;
    if(patch.markGeoReviewed!==undefined){
      const action=patch.markGeoReviewed as Record<string,unknown>;
      if(Object.keys(patch).length!==1||!action||typeof action!=='object'||Array.isArray(action)||typeof expectedUpdatedAt!=='string'||!expectedUpdatedAt)
        return NextResponse.json({status:'error',message:'Invalid versioned review'},{status:400});
      const current=await getContent();
      if(current.updatedAt!==expectedUpdatedAt)throw new StorageConflictError();
      let identity:{key:string;version:string}|undefined;
      if(action.kind==='editorial'&&typeof action.id==='string'){
        const item=(['ar','en','zh'] as const).flatMap(lang=>approvedEditorial(current.editorialItems,lang)).find(x=>x.id===action.id&&editorialPath(x));
        if(item)identity=editorialReviewIdentity(item);
      }else if(action.kind==='faq'&&typeof action.question==='string'){
        const faq=current.faqs.find(f=>f.q===action.question&&f.q.trim()&&f.a.trim()&&!/^STORAGE_TEST_/i.test(f.q));
        if(faq)identity=faqReviewIdentity(faq);
      }
      if(!identity)return NextResponse.json({status:'error',message:'Published content not found'},{status:404});
      const marks=recordReview(current.adminReviewedContent,identity,new Date().toISOString());
      // Review is strictly administrative: no publication state, proof, or public copy changes.
      const content=await setContent({adminReviewedContent:marks},{replaceArrays:true,expectedUpdatedAt});
      return NextResponse.json({status:'updated',content});
    }
    if(patch.adminReviewedContent!==undefined)return NextResponse.json({status:'error',message:'Use versioned review action'},{status:400});
    if(patch.deleteGeoContent!==undefined){
      const action=patch.deleteGeoContent as Record<string,unknown>;
      if(Object.keys(patch).length!==1||!action||typeof action!=='object'||Array.isArray(action)||typeof expectedUpdatedAt!=='string'||!expectedUpdatedAt)
        return NextResponse.json({status:'error',message:'Invalid versioned deletion'},{status:400});
      const current=await getContent();
      if(current.updatedAt!==expectedUpdatedAt)throw new StorageConflictError();
      let next:Parameters<typeof setContent>[0];
      if(action.kind==='editorial'&&typeof action.id==='string'){
        const item=current.editorialItems.find(x=>x.id===action.id);
        if(!item)return NextResponse.json({status:'error',message:'Content not found'},{status:404});
        const route=editorialPath(item);
        const exclusions:Array<{subject_type:'editorial'|'publication';subject_key:string}>=[{subject_type:'editorial',subject_key:item.id},{subject_type:'editorial',subject_key:'title:'+item.title}];
        // Never block the whole homepage, service or packages route when removing a section.
        if(route&&['guide','comparison'].includes(item.kind))exclusions.push({subject_type:'publication',subject_key:route});
        await rememberGeoDeletion('editorial',item.id,item.lang,item,exclusions);
        next={editorialItems:current.editorialItems.filter(x=>x.id!==item.id)};
      }else if(action.kind==='faq'&&typeof action.question==='string'){
        const published=current.faqs.filter(f=>f.q===action.question);
        const drafts=current.drafts.filter(d=>d.q===action.question);
        if(!published.length&&!drafts.length)return NextResponse.json({status:'error',message:'FAQ not found'},{status:404});
        await rememberGeoDeletion('faq',action.question,inferFeedbackLanguage(action.question),{published,drafts},[{subject_type:'faq',subject_key:action.question}]);
        next={faqs:current.faqs.filter(f=>f.q!==action.question),drafts:current.drafts.filter(d=>d.q!==action.question)};
      }else return NextResponse.json({status:'error',message:'Invalid deletion target'},{status:400});
      // If memory/audit fails, never remove the content. If a concurrent write
      // wins, the saved exclusion stays active and the operator can retry.
      const content=await setContent(next,{replaceArrays:true,expectedUpdatedAt});
      return NextResponse.json({status:'updated',content});
    }
    if (patch.contact !== undefined) {
      const c=patch.contact as Record<string,unknown>;
      if(!c||typeof c!=='object'||Array.isArray(c))
        return NextResponse.json({status:'error',message:'Invalid contact settings'},{status:400});
      if(c.whatsapp!==undefined &&
        (typeof c.whatsapp!=='string'||
         (c.whatsapp.trim()!==''&&!/^https:\/\/wa\.me\/[1-9]\d{7,14}(?:\?[^#]*)?$/.test(c.whatsapp.trim()))))
        return NextResponse.json({status:'error',message:'Invalid general WhatsApp URL'},{status:400});
      if(c.whatsappAdvisors!==undefined){
        const advisors=c.whatsappAdvisors as Record<string,unknown>;
        if(!advisors||typeof advisors!=='object'||Array.isArray(advisors)||
          Object.keys(advisors).some(lang=>!['ar','en','zh'].includes(lang))||
          Object.values(advisors).some(value=>{
            if(!value||typeof value!=='object'||Array.isArray(value))return true;
            const profile=value as Record<string,unknown>;
            return Object.keys(profile).some(key=>!['name','title'].includes(key))||
              !validWhatsAppAdvisorField(profile.name,80)||
              !validWhatsAppAdvisorField(profile.title,100);
          }))
          return NextResponse.json({status:'error',message:'Invalid WhatsApp advisor name or job title'},{status:400});
      }
      if(c.whatsappNumbers!==undefined){
        const numbers=c.whatsappNumbers as Record<string,unknown>;
        if(!numbers||typeof numbers!=='object'||Array.isArray(numbers)||
          Object.keys(numbers).some(key=>!['ar','en','zh'].includes(key))||
          ['ar','en','zh'].some(lang=>numbers[lang]!==undefined&&
            (typeof numbers[lang]!=='string'||
              (String(numbers[lang]).trim()!==''&&!normalizeWhatsAppNumber(numbers[lang])))))
          return NextResponse.json({status:'error',message:'WhatsApp advisor numbers must contain international phone numbers for ar/en/zh only'},{status:400});
      }
    }
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
      const before=await getContent();
      const previous=new Map((before.editorialItems||[]).map(x=>[x.id,x]));
      try{
        if(!Array.isArray(patch.editorialItems))throw Error('Invalid editorial batch');
        if(patch.editorialItems.length<=50)validateEditorialBatch(patch.editorialItems);
        else{
          // A versioned update may preserve a pre-existing large backlog but
          // cannot grow it; validate every changed item and all identities.
          if(patch.editorialItems.length>previous.size)throw Error('Invalid editorial batch');
          const ids=new Set<string>();
          for(const raw of patch.editorialItems){
            if(!raw||typeof raw.id!=='string'||ids.has(raw.id))throw Error('Invalid editorial identity');
            ids.add(raw.id);
            if(JSON.stringify(previous.get(raw.id))!==JSON.stringify(raw))validateEditorialItem(raw);
          }
        }
      }catch(e){return NextResponse.json({status:'error',message:e instanceof Error?e.message:'Invalid editorial content'},{status:422})}
      for(const e of patch.editorialItems as Array<{id:string;status:string;title:string;summary:string;body:string}>){
        const p=previous.get(e.id);
        if(!p){
          if(e.status==='approved')return NextResponse.json({status:'error',message:'New editorial items must start in pending review'},{status:422});
          continue;
        }
        if(p.status!=='approved'&&e.status==='approved'){
          const qualityIssues=editorialPublicationIssues(e as any);
          if(qualityIssues.length)return NextResponse.json({status:'error',message:qualityIssues.join(' ')},{status:422});
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
