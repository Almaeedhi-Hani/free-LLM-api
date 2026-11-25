import {buildPublishedLinks} from '@/lib/published-links';
import type {CorrectionCandidate} from '@/components/GeoFeedbackMemory';

/** Derived view data, no request or mutation. */
export function deriveDashboardSummary(content:any,competitors:any[],keywords:any[],opportunities:any[]) {
  const correctionCandidates:CorrectionCandidate[]=[
    ...competitors.filter(c=>c.domain).map(c=>({kind:'competitor' as const,key:String(c.domain),label:c.name+' — '+c.domain})),
    ...keywords.filter(k=>k.term).map(k=>({kind:'keyword' as const,key:String(k.term),language:k.language})),
    ...opportunities.filter(o=>o.title).map(o=>({kind:'opportunity' as const,key:String(o.title)})),
    ...(content.editorialItems||[]).filter((e:any)=>e.id).map((e:any)=>({kind:'editorial' as const,key:String(e.id),language:e.lang,label:e.title})),
    ...(content.faqs||[]).filter((f:any)=>f.q).map((f:any)=>({kind:'faq' as const,key:String(f.q)})),
    ...buildPublishedLinks(content.editorialItems||[],content.faqs||[]).map(p=>({kind:'publication' as const,key:p.path,language:p.language,label:p.title+' — '+p.path}))
  ];
  const uniqueCorrectionCandidates=correctionCandidates.filter((v,i,a)=>a.findIndex(x=>x.kind===v.kind&&x.key===v.key&&x.language===v.language)===i);
  const pendingDrafts = (content.drafts || []).filter((d: any) => d.status === 'pending').length;
  const competitorBackedOpps = opportunities.filter((o: any) => o.type === 'content_gap').length;
  const keywordDerivedOpps = opportunities.filter((o: any) => o.type === 'keyword_gap').length;
  return {uniqueCorrectionCandidates,pendingDrafts,competitorBackedOpps,keywordDerivedOpps};
}
