import type {ImpactItem,ImpactMeasurement,ImpactStats} from './content-impact';

export type GeoPriorityBasis='reported_lead'|'observed_gsc'|'unmeasured';
export type GeoAction='review_content'|'technical_handoff'|'review_faq';

/**
 * Read-only operational work queue, not an SEO outcome forecast.
 *
 * - Includes only pending saved GEO tasks/ideas, not published or rejected content.
 * - A GSC value requires a stored page-dimension row for that exact locale/path.
 * - A lead signal requires a persisted client-reported source path; the source
 *   comes from the browser and does not establish causation or a paid conversion.
 * - No GSC page row means UNKNOWN, never zero. No fabricated impact score.
 * - Technical tasks remain development handoffs, not visitor-facing publications.
 */
export interface GeoWorkPriority {
 item:ImpactItem;
 basis:GeoPriorityBasis;
 metric:ImpactStats|null;
 clientReportedLeads:number|null;
 action:GeoAction;
 evidenceIds:number;
 verifiedSources:number;
}

const validDate=(value:string|null):number=>{
 if(!value)return Number.POSITIVE_INFINITY;
 const millis=Date.parse(value);
 return Number.isFinite(millis)?millis:Number.POSITIVE_INFINITY;
};

export function prioritizeGeoWork(
 items:readonly ImpactItem[],
 measurement:ImpactMeasurement|null
):GeoWorkPriority[]{
 const pageMetrics:Record<string,ImpactStats>=measurement?.status==='available'?measurement.pages:{};
 const leadPages=measurement?.leads?.status==='available'?measurement.leads.byPage:null;
 const pending=items.filter(item=>item.status==='pending');
 const queue:GeoWorkPriority[]=pending.map(item=>{
  const page=item.category==='page'&&item.targetPath?item.targetPath:null;
  const metric=page?pageMetrics?.[page]??null:null;
  const leads=page&&leadPages?leadPages[page]?.clientReported??0:null;
  const hasLead=typeof leads==='number'&&leads>0;
  const action:GeoAction=item.category==='task'?'technical_handoff':
   item.category==='faq'?'review_faq':'review_content';
  return {
   item,
   basis:hasLead?'reported_lead':metric?'observed_gsc':'unmeasured',
   metric,
   clientReportedLeads:leads,
   action,
   evidenceIds:item.sourceIds.length,
   verifiedSources:item.verifiedSources.length
  };
 });
 const priorityOrder:Record<GeoPriorityBasis,number>={
  reported_lead:0,observed_gsc:1,unmeasured:2
 };
 const actionOrder:Record<GeoAction,number>={
  review_content:0,technical_handoff:1,review_faq:2
 };
 return queue.sort((a,b)=>{
  const basis=priorityOrder[a.basis]-priorityOrder[b.basis];
  if(basis)return basis;
  if(a.basis!=='unmeasured'){
   const leads=(b.clientReportedLeads??0)-(a.clientReportedLeads??0);
   if(leads)return leads;
   const impressions=(b.metric?.impressions??0)-(a.metric?.impressions??0);
   if(impressions)return impressions;
   const clicks=(b.metric?.clicks??0)-(a.metric?.clicks??0);
   if(clicks)return clicks;
  }
  // Missing metrics get only deterministic editorial/operational order.
  const action=actionOrder[a.action]-actionOrder[b.action];
  if(action)return action;
  const age=validDate(a.item.createdAt)-validDate(b.item.createdAt);
  if(age)return age;
  return a.item.id.localeCompare(b.item.id);
 });
}
