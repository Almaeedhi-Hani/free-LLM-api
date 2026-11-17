import type { CompetitorObservation, Language } from './market-intelligence';

export interface CompetitorPageEvidenceBrief {
  competitor_id: string;
  language: Language;
  query: string;
  url: string;
  title: string | null;
  observed_at: string;
  verified_rank: number | null;
  evidence_status: 'verified_serp' | 'provider_candidate';
  strengths: string[];
  weaknesses: string[];
  review_required: true;
}

/**
 * Read-only editorial input: never infer a Google rank from discovery-provider order.
 * Strengths/weaknesses must be explicitly present in observations, not generated guesses.
 */
export function buildCompetitorPageEvidenceBriefs(
  observations: readonly CompetitorObservation[],
  limit = 100,
): CompetitorPageEvidenceBrief[] {
  const capped = Number.isFinite(limit) ? Math.max(0, Math.min(500, Math.trunc(limit))) : 0;
  const seen = new Set<string>();
  const result: CompetitorPageEvidenceBrief[] = [];
  for (const observation of [...observations].sort((a,b) =>
    b.observed_at.localeCompare(a.observed_at) || a.id.localeCompare(b.id))) {
    if (result.length >= capped) break;
    if (!['ar','en','zh'].includes(observation.language) || !observation.query?.trim() || !observation.url) continue;
    let url: URL;
    try { url = new URL(observation.url); } catch { continue; }
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password) continue;
    const key = [observation.competitor_id, observation.language, observation.query.trim().toLowerCase(), url.href].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const verified = observation.raw?.rank_status === 'verified_serp' &&
      Number.isInteger(observation.rank) && typeof observation.rank === 'number' &&
      observation.rank >= 1 && observation.rank <= 5;
    result.push({
      competitor_id: observation.competitor_id,
      language: observation.language,
      query: observation.query.trim(),
      url: url.href,
      title: observation.title?.trim() || null,
      observed_at: observation.observed_at,
      verified_rank: verified ? observation.rank! : null,
      evidence_status: verified ? 'verified_serp' : 'provider_candidate',
      strengths: observation.strengths || [],
      weaknesses: observation.weaknesses || [],
      review_required: true,
    });
  }
  return result;
}
