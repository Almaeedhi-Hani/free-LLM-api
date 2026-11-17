import { topicNodeById } from './content-tree';
import type { ReviewedGeoOpportunity } from './reviewed-geo-opportunities';

/** A planning handoff, NOT a publishable EditorialItem or approved source. */
export interface EditorialOpportunityHandoff {
  kind: 'internal_link';
  status: 'pending_review';
  language: 'ar' | 'en' | 'zh';
  topic_node_id: string;
  target_route: string;
  primary_keyword: string;
  question: string;
  query: string;
  competitor_url: string;
  verified_rank: number | null;
  evidence_status: 'verified_serp' | 'provider_candidate';
  suggested_links: Array<{node_id:string;route:string;anchor:string}>;
  review_required: true;
}

/** Use only existing multilingual tree copy. Never generate claims or publish content. */
export function prepareEditorialOpportunityHandoff(
  opportunity: ReviewedGeoOpportunity,
): EditorialOpportunityHandoff | null {
  const node=topicNodeById(opportunity.topic_id);
  if (!node?.route || node.route!==opportunity.target_route ||
      !['ar','en','zh'].includes(opportunity.language) || !opportunity.review_required) return null;
  const language=opportunity.language;
  const verified=opportunity.evidence_status==='verified_serp' &&
    Number.isInteger(opportunity.verified_rank) && opportunity.verified_rank!==null &&
    opportunity.verified_rank>=1 && opportunity.verified_rank<=5;
  return {
    kind:'internal_link',status:'pending_review',language,topic_node_id:node.id,
    target_route:node.route,primary_keyword:node.primary_keyword[language],
    question:node.main_question[language],query:opportunity.query,
    competitor_url:opportunity.competitor_url,
    verified_rank:verified?opportunity.verified_rank:null,
    evidence_status:verified?'verified_serp':'provider_candidate',
    suggested_links:opportunity.suggested_links.filter(link=>link.route!==node.route && Boolean(link.route)).map(link=>({...link})),
    review_required:true,
  };
}
