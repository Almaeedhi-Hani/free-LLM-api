import { recordObservation, upsertCompetitor, findVerifiedSerpObservation } from './market-intelligence';
import type { Language } from './market-intelligence';

/** Explicitly verified organic SERP evidence, never a provider candidate. */
export interface VerifiedSerpObservation {
  query: string;
  language: Language;
  source: string;
  observed_at: string;
  url: string;
  rank: number;
  rank_status: 'verified_serp';
  title?: string;
}

/** Pure validation keeps invalid input away from persistent competitor records. */
export function validateVerifiedSerpObservation(input: VerifiedSerpObservation): boolean {
  if (!input || !['ar', 'en', 'zh'].includes(input.language)) return false;
  if (!input.query?.trim() || !input.source?.trim() || input.rank_status !== 'verified_serp') return false;
  if (!Number.isInteger(input.rank) || input.rank < 1 || input.rank > 5) return false;
  if (!input.observed_at || !Number.isFinite(Date.parse(input.observed_at))) return false;
  if (['exa', 'tavily', 'parallel', 'firecrawl', 'google-suggest', 'bing-rss'].includes(input.source.toLowerCase())) return false;
  try {
    const url = new URL(input.url);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && Boolean(url.hostname);
  } catch { return false; }
}

/** Called only after a trusted SERP export has been normalized and approved for ingestion. */
export async function saveVerifiedSerpObservations(items: readonly VerifiedSerpObservation[]): Promise<{saved: number; rejected: number}> {
  let saved = 0, rejected = 0;
  const seen = new Set<string>();
  for (const item of items) {
    if (!validateVerifiedSerpObservation(item)) { rejected++; continue; }
    const key = [item.language, item.query.trim().toLowerCase(), item.observed_at, item.rank, new URL(item.url).toString()].join('|');
    if (seen.has(key)) { rejected++; continue; }
    seen.add(key);
    const domain = new URL(item.url).hostname.toLowerCase().replace(/^www\./, '');
    // Check previously persisted evidence before inserting another observation.
    const competitor = await upsertCompetitor({domain, name: domain, languages: [item.language], source: 'search'});
    const duplicate = await findVerifiedSerpObservation({
      competitor_id: competitor.id, language: item.language, query: item.query,
      observed_at: item.observed_at, rank: item.rank, url: item.url, source: item.source,
    });
    if (duplicate) { rejected++; continue; }
    await recordObservation({
      competitor_id: competitor.id, language: item.language, query: item.query.trim(),
      observed_at: item.observed_at, url: item.url, rank: item.rank, title: item.title,
      raw: {source_id: item.source, rank_status: 'verified_serp', evidence_status: 'verified'},
    });
    saved++;
  }
  return {saved, rejected};
}
