import type { PrioritizedEvidenceLinkRecommendation } from './evidence-link-recommendations';

/** Review-only opportunity; priority is a transparent editorial heuristic, not projected search impact. */
export interface ReviewedGeoOpportunity {
  topic_id: string;
  target_route: string;
  language: 'ar' | 'en' | 'zh';
  query: string;
  competitor_url: string;
  evidence_status: 'verified_serp' | 'provider_candidate';
  verified_rank: number | null;
  priority_score: number;
  priority_band: 'high' | 'medium' | 'low';
  reasons: string[];
  suggested_links: Array<{node_id:string;route:string;anchor:string}>;
  review_required: true;
}

/** Deduplicate repeated observations of the same topic/query/competitor without losing provenance. */
export function buildReviewedGeoOpportunities(
  ranked: readonly PrioritizedEvidenceLinkRecommendation[],
  limit = 100,
): ReviewedGeoOpportunity[] {
  const seen = new Set<string>();
  const result: ReviewedGeoOpportunity[] = [];
  const cap = Number.isFinite(limit) ? Math.max(0, Math.min(500, Math.trunc(limit))) : 0;
  for (const item of ranked) {
    if (result.length >= cap) break;
    const r = item.recommendation;
    if (!r.review_required || !r.topic_id || !r.target_route || !r.query.trim() ||
        !['ar','en','zh'].includes(r.language)) continue;
    const key = [r.topic_id,r.language,r.query.trim().toLowerCase(),r.competitor_url].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const verified = r.evidence_status === 'verified_serp' &&
      Number.isInteger(r.verified_rank) && r.verified_rank !== null &&
      r.verified_rank >= 1 && r.verified_rank <= 5;
    result.push({
      topic_id:r.topic_id,target_route:r.target_route,language:r.language,query:r.query.trim(),
      competitor_url:r.competitor_url,
      evidence_status:verified ? 'verified_serp' : 'provider_candidate',
      verified_rank:verified ? r.verified_rank : null,
      priority_score:item.priority_score,priority_band:item.priority_band,
      reasons:[...item.reasons],suggested_links:r.suggested_links.map(link=>({...link})),
      review_required:true,
    });
  }
  return result;
}
