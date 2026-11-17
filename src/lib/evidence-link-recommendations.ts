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
  if (!brief.query?.trim() || !brief.url) return null;
  let evidenceUrl: URL;
  try { evidenceUrl = new URL(brief.url); } catch { return null; }
  if (!['http:', 'https:'].includes(evidenceUrl.protocol) || !evidenceUrl.hostname ||
      evidenceUrl.username || evidenceUrl.password) return null;
  // Avoid treating provider-order positions as verified Google rankings.
  const verified_rank = brief.evidence_status === 'verified_serp' &&
    typeof brief.verified_rank === 'number' && Number.isInteger(brief.verified_rank) &&
    brief.verified_rank >= 1 && brief.verified_rank <= 5 ? brief.verified_rank : null;
  return {
    topic_id: selectedTopicId,
    language: brief.language,
    target_route,
    competitor_url: evidenceUrl.href,
    query: brief.query,
    evidence_status: verified_rank !== null ? 'verified_serp' : 'provider_candidate',
    verified_rank,
    documented_weaknesses: [...brief.weaknesses],
    suggested_links: suggestInternalLinks(selectedTopicId, brief.language),
    review_required: true,
  };
}

/** Transparent editorial triage heuristic, NOT a measured SEO impact or Google ranking. */
export interface PrioritizedEvidenceLinkRecommendation {
  recommendation: EvidenceLinkRecommendation;
  priority_score: number;
  priority_band: 'high' | 'medium' | 'low';
  reasons: string[];
  review_required: true;
}

export function prioritizeEvidenceLinkRecommendations(
  recommendations: readonly EvidenceLinkRecommendation[],
): PrioritizedEvidenceLinkRecommendation[] {
  return recommendations.map(recommendation => {
    const verified = recommendation.evidence_status === 'verified_serp' &&
      typeof recommendation.verified_rank === 'number' &&
      Number.isInteger(recommendation.verified_rank) &&
      recommendation.verified_rank >= 1 && recommendation.verified_rank <= 5;
    const documentedWeaknesses = Array.from(new Set(
      recommendation.documented_weaknesses.map(x => x.trim()).filter(Boolean),
    ));
    const linkCount = new Set(recommendation.suggested_links
      .filter(link => link.route && link.route !== recommendation.target_route)
      .map(link => link.route)).size;
    const reasons: string[] = [];
    let priority_score = 0;
    if (verified) { priority_score += 40; reasons.push('verified_serp_evidence'); }
    else reasons.push('unverified_candidate_requires_validation');
    if (documentedWeaknesses.length) {
      priority_score += Math.min(30, documentedWeaknesses.length * 10);
      reasons.push('documented_competitor_weaknesses');
    }
    if (linkCount) {
      priority_score += Math.min(20, linkCount * 5);
      reasons.push('existing_internal_link_destinations');
    }
    if (recommendation.target_route.startsWith('/services/')) {
      priority_score += 10;
      reasons.push('service_page_target');
    }
    const priority_band: 'high' | 'medium' | 'low' = priority_score >= 65 ? 'high' :
      priority_score >= 35 ? 'medium' : 'low';
    return {recommendation, priority_score, priority_band, reasons, review_required: true as const};
  }).sort((a,b) => b.priority_score - a.priority_score ||
    a.recommendation.target_route.localeCompare(b.recommendation.target_route) ||
    a.recommendation.language.localeCompare(b.recommendation.language) ||
    a.recommendation.competitor_url.localeCompare(b.recommendation.competitor_url));
}
