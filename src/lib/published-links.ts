import type {EditorialItem} from './editorial-types';
import type {ContentDraft,ContentFAQ} from './content-store';
import {approvedEditorial} from './editorial-workflow';
import {editorialPath} from './content-impact';

export type PublicationEventSummary={
 id:string;item_id:string;kind:'editorial'|'faq';status:string;
 published_at:string;rolled_back_at?:string|null;target_path?:string;
};
export type PublishedLink={
 id:string;title:string;language:'ar'|'en'|'zh';kind:string;publishedAt:string|null;
 publicationSource:'آلي'|'يدوي'|'غير معروف';path:string;
};
export type UnpublishedPreview={id:string;title:string;kind:string;language:string;status:string;preview:string};
const validDate=(value:unknown):string|null=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
const publicPagePath=(path:string|null):path is string=>
  typeof path==='string'&&/^\/(?!\/)(?:[a-z0-9/-]*|)$/.test(path)&&!path.startsWith('/admin')&&!path.startsWith('/api');
const latestActiveEvent=(events:readonly PublicationEventSummary[],kind:'editorial'|'faq',id:string)=>{
 const matches=events.filter(e=>e.kind===kind&&e.item_id===id)
   .sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)));
 const latest=matches[0];
 return latest?.status==='published'&&!latest.rolled_back_at?latest:null;
};
const source=(method:'human'|'automated'|undefined,event:PublicationEventSummary|null):PublishedLink['publicationSource']=>
  event||method==='automated'?'آلي':method==='human'?'يدوي':'غير معروف';

/** Exactly the live route's approval gate, with links derived from editorialPath.
 * Publication events enrich provenance only; historical events never turn a
 * pending/rejected/rolled-back item into a live item. */
export function buildPublishedLinks(
 editorial:readonly EditorialItem[],faqs:readonly ContentFAQ[],
 events:readonly PublicationEventSummary[]=[]
):PublishedLink[]{
 const live=(['ar','en','zh'] as const).flatMap(lang=>approvedEditorial(editorial,lang))
  .map(item=>({item,path:editorialPath(item)}))
  .filter((entry):entry is {item:EditorialItem;path:string}=>publicPagePath(entry.path));
 const pages:PublishedLink[]=live.map(({item,path})=>{
  const event=latestActiveEvent(events,'editorial',item.id);
  return {id:'editorial:'+item.id,title:item.title,language:item.lang,kind:item.kind,
   path,publicationSource:source(item.approval_method,event),
   publishedAt:validDate(event?.published_at)||validDate(item.auto_published_at)||validDate(item.reviewedAt)};
 });
 // The public home page renders persisted FAQs on the Arabic locale only.
 // A publication event without the current FAQ content is historical, NOT live.
 const questions:PublishedLink[]=faqs
  .filter(f=>typeof f.q==='string'&&typeof f.a==='string'&&f.q.trim()&&f.a.trim()&&!/^STORAGE_TEST_/i.test(f.q))
  .map((faq,i)=>{
   const event=latestActiveEvent(events,'faq',faq.q);
   return {id:'faq:'+i+':'+faq.q,title:faq.q,language:'ar' as const,kind:'faq',
    path:'/',publicationSource:source(faq.approval_method,event),
    publishedAt:validDate(event?.published_at)};
  });
 return [...pages,...questions].sort((a,b)=>(Date.parse(b.publishedAt||'')||0)-(Date.parse(a.publishedAt||'')||0));
}

/** Previews are text only. Never attach a public URL to an unpublished draft. */
export function buildUnpublishedPreviews(editorial:readonly EditorialItem[],drafts:readonly ContentDraft[]):UnpublishedPreview[]{
 const pages=editorial.filter(item=>item.status==='pending')
  .map(item=>({id:'editorial:'+item.id,title:item.title,language:item.lang,
   kind:item.kind,status:item.status,preview:item.summary||item.body||''}));
 const questions=drafts.filter(draft=>draft.status==='pending')
  .map((draft,i)=>({id:'draft:'+i+':'+draft.q,title:draft.q,language:'غير محددة',
   kind:'faq_draft',status:draft.status,preview:draft.a}));
 return [...pages,...questions];
}
