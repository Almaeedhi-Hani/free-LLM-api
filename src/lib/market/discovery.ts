import type { Language, TriggeredBy } from './types';
import { classifyIntent } from './classification';
import { isExcludedDomain } from './domain-exclusions';
import { listCompetitors, upsertCompetitor, recordObservation, listObservations } from './competitors';
import { upsertKeyword } from './keywords';
import { listRadarRuns } from './runs';
import { defaultSources, availableSources } from '../market-sources';
import { getGeoFeedbackIndex, isExcluded } from '../geo-agent-feedback';
import { isRelevantInvestorService } from '../open-search-sources';
import { RADAR_QUERIES, selectRadarQuery } from '../radar-query-plan';
import { buildQueryMemory, chooseNextQueries } from '../radar-memory';
import type { QueryAttempt } from '../radar-memory';
import { calculateRadarMetrics } from '../radar-metrics';
import type { RadarMetrics, RadarObservationMetric } from '../radar-metrics';

export interface DiscoveryConfig {
  seeds?: Record<Language, string[]>;
  allowedSourceIds?: string[];
  maxSuggestionsPerSeed?: number;
  maxCompetitors?: number;
  triggeredBy?: TriggeredBy;
}

export interface DiscoverySummary {
  sources_used: string[];
  sources_unavailable: string[];
  suggestions_collected: number;
  keywords_upserted: number;
  keyword_terms_saved?: string[];
  competitor_domains_discovered?: string[];
  competitors_discovered: number;
  observations_recorded: number;
  unique_domains: number;
  success: boolean;
  search_diagnostics: { source_id: string; language: string; http_status: number; duration_ms: number; response_received: boolean; results_parsed: number; results_accepted: number; blocked_detected: boolean; failure_reason: string; request_count?: number; }[];
  search_queries: (QueryAttempt & {source_id: string; results_accepted: number})[];
  suggestion_requests_used: number;
  suggestion_requests_limit: number;
  search_requests_used: number;
  search_requests_limit: number;
  radar_metrics: RadarMetrics;
  errors: string[];
}

const DEFAULT_SEEDS: Record<Language, string[]> = {
  ar: RADAR_QUERIES.ar.map((entry) => entry.query),
  en: RADAR_QUERIES.en.map((entry) => entry.query),
  zh: RADAR_QUERIES.zh.map((entry) => entry.query),
};

export async function runDiscovery(config?: Partial<DiscoveryConfig>): Promise<DiscoverySummary> {
  const feedback=await getGeoFeedbackIndex();
  const seeds = config?.seeds || DEFAULT_SEEDS;
  const maxSug = config?.maxSuggestionsPerSeed ?? 10;
  const maxComp = config?.maxCompetitors ?? 20;

  const allSources = defaultSources();
  const sources = config?.allowedSourceIds ? allSources.filter((s) => config.allowedSourceIds!.includes(s.id)) : allSources;
  const summary: DiscoverySummary = {
    sources_used: [],
    sources_unavailable: availableSources().filter((s) => !s.available).map((s) => s.id),
    suggestions_collected: 0,
    keywords_upserted: 0,
    keyword_terms_saved: [],
    competitor_domains_discovered: [],
    competitors_discovered: 0,
    observations_recorded: 0,
    unique_domains: 0,
    success: false,
    search_diagnostics: [],
    search_queries: [],
    suggestion_requests_used: 0,
    suggestion_requests_limit: 3,
    search_requests_used: 0,
    search_requests_limit: 6,
    radar_metrics: calculateRadarMetrics([], []),
    errors: [],
  };

  const collectedTerms = new Set<string>();
  const discoveredDomains = new Set<string>();
  const searchDiagnostics: DiscoverySummary['search_diagnostics'] = [];
  const runObservations: RadarObservationMetric[] = [];





  // Reuse stored observations and search attempts (including empty searches) from
  // the existing analysis_runs summaries; no migrations or new credentials.
  let adaptiveQueries: Partial<Record<Language, string>> = {};
  if (!config?.seeds) {
    try {
      const competitors = (await listCompetitors({ status: 'active' })).slice(0, 50);
      const observations = (await Promise.all(competitors.map(c => listObservations(c.id, 100)))).flat();
      const recentRuns = await listRadarRuns(100);
      const priorAttempts: QueryAttempt[] = recentRuns.flatMap(run => {
        if (run.run_type !== 'radar') return [];
        const data = run.summary as {
          search_queries?: QueryAttempt[];
          discovery?: { search_queries?: QueryAttempt[] };
        } | null;
        const queries = data?.search_queries ?? data?.discovery?.search_queries ?? [];
        return Array.isArray(queries)
          ? queries.filter(q => q && typeof q.query === 'string' && typeof q.language === 'string' && typeof q.attempted_at === 'string')
          : [];
      });
      const selected = chooseNextQueries(buildQueryMemory(observations, new Date(), priorAttempts));
      adaptiveQueries = Object.fromEntries(selected.map(q => [q.language, q.query]));
    } catch (e) {
      summary.errors.push('Query memory unavailable; using daily rotation: ' + (e instanceof Error ? e.message : String(e)));
    }
  }
  const selectedSeed = (lang: Language): string | undefined => {
    const seedList = seeds[lang] || [];
    if (config?.seeds) return seedList.length ? seedList[Math.floor(Date.now() / 86400000) % seedList.length] : undefined;
    return adaptiveQueries[lang] || selectRadarQuery(lang, new Date()).query;
  };

  // 1) Independently cap suggestion API calls to three total (one per language).
  let suggestionRequests = 0;
  const maxSuggestionRequests = 3;
  for (const source of sources) {
    if (suggestionRequests >= maxSuggestionRequests) break;
    if (!source.collectSuggestions) continue;
    summary.sources_used.push(source.id);
    for (const lang of ['ar', 'en', 'zh'] as Language[]) {
      const query = selectedSeed(lang);
      for (const seed of query ? [query] : []) {
        if (suggestionRequests >= maxSuggestionRequests) break;
        suggestionRequests += 1;
        try {
          const res = await source.collectSuggestions(seed, lang);
          const limited = res.slice(0, maxSug);
          summary.suggestions_collected += limited.length;
          for (const r of limited) {
            const term = r.term.trim();
            if (!term || isExcluded(feedback,'keyword',term,lang) ||
                collectedTerms.has(`${term}|${lang}`)) continue;
            collectedTerms.add(`${term}|${lang}`);
            try {
              await upsertKeyword({
                term,
                language: lang,
                intent: classifyIntent(term),
                source: r.source,
                volume_confidence: 'unknown',
              });
              summary.keywords_upserted += 1;
              summary.keyword_terms_saved!.push(term);
            } catch (e) {
              summary.errors.push(`keyword upsert failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        } catch (e) {
          summary.errors.push(`${source.id} suggest failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  summary.suggestion_requests_used = suggestionRequests;

  // 2) Search-provider discovery: hard per-run budget, graceful fallback on provider blocks.
  let requestsUsed = 0;
  const maxSearchRequests = 6;
  for (const source of sources) {
    if (!source.collectResults) continue;
    if (source.requiresKey && !(process.env[source.requiresKey] || '').trim()) continue;
    for (const lang of ['ar', 'en', 'zh'] as Language[]) {
      const chosenSeed = selectedSeed(lang);
      for (const seed of chosenSeed ? [chosenSeed] : []) {
        const reservation = Math.min(maxSearchRequests - requestsUsed, source.id === 'multi-provider-search' ? 2 : 1);
        if (reservation <= 0) break;
        // Reserve the worst-case number of requests before calling the provider.
        requestsUsed += reservation;
        summary.search_queries.push({language: lang, query: seed, attempted_at: new Date().toISOString(), source_id: source.id, results_accepted: 0});
        const diag = { source_id: source.id, language: lang, http_status: 0, duration_ms: 0, response_received: false, results_parsed: 0, results_accepted: 0, blocked_detected: false, failure_reason: '', request_count: reservation };
        try {
          const results = await source.collectResults!(seed, lang, maxComp, reservation);
           const srcDiag = (source as any).lastDiagnostic;
           if (srcDiag) {
             diag.http_status = srcDiag.http_status;
             diag.duration_ms = srcDiag.duration_ms;
             diag.response_received = srcDiag.response_received;
             diag.blocked_detected = srcDiag.blocked_detected;
             if (srcDiag.failure_reason) diag.failure_reason = srcDiag.failure_reason;
             if (source.id === 'multi-provider-search') {
               diag.request_count = Math.max(0, Math.min(reservation, srcDiag.request_count ?? reservation));
               requestsUsed -= reservation - diag.request_count;
             }
           }
          diag.results_parsed = results.length;
          for (const r of results) {
            if (!r.domain || isExcluded(feedback,'competitor',r.domain)) continue;
            if (discoveredDomains.size >= maxComp && !discoveredDomains.has(r.domain)) continue;
            if (isExcludedDomain(r.domain)) continue;
            if (!isRelevantInvestorService(r.title || '', r.snippet || '')) continue;
            try {
              const comp = await upsertCompetitor({
                name: r.title || r.domain,
                domain: r.domain,
                languages: [lang],
                source: 'search',
                notes: `Discovered via ${source.id} for query "${seed}"`,
              });
               // Count each domain once, but retain observations across languages and queries.
               // Otherwise the competitor-angle matrix loses evidence of repeated appearances.
               if (!discoveredDomains.has(r.domain)) {
                 discoveredDomains.add(r.domain);
                 summary.competitors_discovered += 1;
               }
              const observedAt = new Date().toISOString();
              // Brave Search results must not be persisted under its search-result usage terms.
              const retainEvidence = source.id !== 'brave-search';
              await recordObservation({
                competitor_id: comp.id,
                language: lang,
                 query: seed,
                 // Discovery providers return candidates, not verified organic Google ranks.
                 rank: null,
                 title: retainEvidence ? r.title : undefined,
                 snippet: retainEvidence ? r.snippet : undefined,
                 url: retainEvidence ? r.url : undefined,
                observed_at: observedAt,
                strengths: [],
                weaknesses: [],
                raw: retainEvidence ? {source_id: source.id, result_order: r.rank, rank_status: 'unverified_provider_order', evidence_status: 'candidate'} : undefined,
              });
              summary.observations_recorded += 1;
              diag.results_accepted += 1;
              runObservations.push({competitor_id: comp.id, language: lang, query: seed, url: retainEvidence ? r.url : undefined, observed_at: observedAt});
            } catch (e) {
              summary.errors.push(`competitor upsert failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          summary.search_queries[summary.search_queries.length - 1].results_accepted = diag.results_accepted;
          searchDiagnostics.push(diag);
        } catch (e) {
          diag.failure_reason = e instanceof Error ? e.message : String(e);
          searchDiagnostics.push(diag);
          summary.errors.push(`${source.id} search failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  summary.search_diagnostics = searchDiagnostics;
  summary.unique_domains = discoveredDomains.size;
  summary.competitor_domains_discovered = Array.from(discoveredDomains);
  summary.search_requests_used = requestsUsed;
  summary.radar_metrics = calculateRadarMetrics(runObservations, searchDiagnostics);
  summary.success = summary.competitors_discovered > 0 || summary.observations_recorded > 0;
  return summary;
}
