import { suggestInternalLinks, siteTopicPath, topicNodeById } from './content-tree';
import type { CompetitorPageEvidenceBrief } from './competitor-page-evidence';

/** Draft suggestions only; no writes, publication or inferred competitor claims. */
export interface EvidenceLinkRecommendation {
  topic_id: string;
  language: 'ar' | 'en' | 'zh';
  target_route: string;
  competitor_url: string;
  query: string;
  evidence_status: CompetitorPageEvidenceBrief['evidence_status'];
  verified_rank: number | null;
  documented_weaknesses: string[];
  suggested_links: Array<{node_id:string;route:string;anchor:string}>;
  review_required: true;
}

/**
 * The editorial reviewer explicitly selects a topic ID. A search query alone
 * cannot establish topic equivalence, so this function never guesses one.
 */
export function recommendLinksForReviewedEvidence(
  brief: CompetitorPageEvidenceBrief,
  selectedTopicId: string,
): EvidenceLinkRecommendation | null {
  const node = topicNodeById(selectedTopicId);
  const target_route = siteTopicPath(selectedTopicId);
  if (!node || !target_route || !['ar','en','zh'].includes(brief.language)) return null;
  if (!brief.query.trim() || !brief.url.startsWith('https://') && !brief.url.startsWith('http://')) return null;
  // Avoid treating provider-order positions as verified Google rankings.
  const verified_rank = brief.evidence_status === 'verified_serp' &&
    typeof brief.verified_rank === 'number' && Number.isInteger(brief.verified_rank) &&
    brief.verified_rank >= 1 && brief.verified_rank <= 5 ? brief.verified_rank : null;
  return {
    topic_id: selectedTopicId,
    language: brief.language,
    target_route,
    competitor_url: brief.url,
    query: brief.query,
    evidence_status: verified_rank !== null ? 'verified_serp' : 'provider_candidate',
    verified_rank,
    documented_weaknesses: [...brief.weaknesses],
    suggested_links: suggestInternalLinks(selectedTopicId, brief.language),
    review_required: true,
  };
}
