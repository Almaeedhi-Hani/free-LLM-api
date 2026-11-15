/** Pure, evidence-based radar metrics. No API calls or paid providers. */
export interface RadarObservationMetric {
  competitor_id: string;
  language: string;
  query: string;
  rank?: number | null;
  url?: string;
  observed_at?: string;
}
export interface RadarSearchDiagnostic {
  source_id: string;
  language: string;
  response_received: boolean;
  results_parsed: number;
  results_accepted: number;
  request_count?: number;
  blocked_detected: boolean;
  failure_reason: string;
}
export interface RadarMetrics {
  observations: number;
  unique_competitors: number;
  unique_queries: number;
  languages_covered: number;
  evidenced_observations: number;
  evidence_coverage_percent: number;
  search_attempts: number;
  provider_requests: number;
  search_responses: number;
  search_response_rate_percent: number | null;
  results_parsed: number;
  results_accepted: number;
  blocked_attempts: number;
  provider_failures: number;
}
export function calculateRadarMetrics(
  observations: readonly RadarObservationMetric[],
  diagnostics: readonly RadarSearchDiagnostic[],
): RadarMetrics {
  const evidenced = observations.filter((o) => /^https?:\/\//i.test(o.url || '') && Boolean(o.observed_at));
  const searchResponses = diagnostics.filter((d) => d.response_received).length;
  return {
    observations: observations.length,
    unique_competitors: new Set(observations.map((o) => o.competitor_id)).size,
    unique_queries: new Set(observations.map((o) => o.language + ':' + o.query.trim().toLowerCase())).size,
    languages_covered: new Set(observations.map((o) => o.language)).size,
    evidenced_observations: evidenced.length,
    evidence_coverage_percent: observations.length ? Math.round(100 * evidenced.length / observations.length) : 0,
    search_attempts: diagnostics.length,
    provider_requests: diagnostics.reduce((n, d) => n + Math.max(0, d.request_count ?? 1), 0),
    search_responses: searchResponses,
    search_response_rate_percent: diagnostics.length ? Math.round(100 * searchResponses / diagnostics.length) : null,
    results_parsed: diagnostics.reduce((n, d) => n + Math.max(0, d.results_parsed), 0),
    results_accepted: diagnostics.reduce((n, d) => n + Math.max(0, d.results_accepted), 0),
    blocked_attempts: diagnostics.filter((d) => d.blocked_detected).length,
    provider_failures: diagnostics.filter((d) => Boolean(d.failure_reason)).length,
  };
}
