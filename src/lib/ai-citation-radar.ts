import promptSet from '../../geo/prompt-set.json';
import { assessKeyword, type KeywordLanguage } from './keyword-relevance-eval';

const measurements = ['model_only', 'search_grounded', 'manual_ai_search'] as const;
type Measurement = typeof measurements[number];
type Prompt = (typeof promptSet.prompts)[number];
const prompts = new Map(promptSet.prompts.map(prompt => [prompt.id, prompt]));
const minimumRepetitions = 3;

interface Observation {
  measurement_type: Measurement;
  provider: string;
  prompt_version: number;
  prompt_id: string;
  prompt_text: string;
  observed_at: string;
  answer_evidence_url: string;
  evidence_reviewed: true;
  grounding_evidence_url?: string;
  cited_urls: string[];
  mentioned: boolean;
  recommended: boolean;
  recommendation_reason?: string;
}

interface Panel {
  from: string;
  until: string;
  sampling_profile: string;
  site_hosts: string[];
  competitor_hosts: string[];
}

interface Rate {
  hits: number;
  samples: number;
  percent: number | null;
  interval_95_percent: [number, number] | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function timestamp(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value.replace(/(\d\d:\d\d:\d\d)Z$/, '$1.000Z')
    ? time
    : NaN;
}

function webUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && /^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/i.test(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

function hostName(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

function hostSet(values: unknown): Set<string> | null {
  if (!Array.isArray(values) || !values.every(value =>
    typeof value === 'string' && /^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/i.test(value))) return null;
  return new Set(values.map(hostName));
}

function parseObservation(input: unknown, panel: Panel): Observation | null {
  const row = asRecord(input);
  if (!row) return null;
  const time = timestamp(row.observed_at);
  const prompt = typeof row.prompt_id === 'string' ? prompts.get(row.prompt_id) : undefined;
  if (!measurements.includes(row.measurement_type as Measurement) ||
      typeof row.provider !== 'string' || !/^[a-z0-9][a-z0-9. _-]{0,79}$/i.test(row.provider) ||
      !prompt || row.prompt_version !== promptSet.version || row.prompt_text !== prompt.text ||
      !Number.isFinite(time) || time < timestamp(panel.from) || time >= timestamp(panel.until) ||
      row.sampling_profile !== panel.sampling_profile || row.evidence_reviewed !== true ||
      !webUrl(row.answer_evidence_url) || !Array.isArray(row.cited_urls) ||
      !row.cited_urls.every(url => Boolean(webUrl(url))) ||
      typeof row.mentioned !== 'boolean' || typeof row.recommended !== 'boolean' ||
      (row.recommended && (!row.mentioned || typeof row.recommendation_reason !== 'string' ||
        !row.recommendation_reason.trim()))) return null;
  if (row.measurement_type === 'search_grounded' && !webUrl(row.grounding_evidence_url)) return null;
  if (row.measurement_type === 'model_only' && row.cited_urls.length) return null;
  return row as unknown as Observation;
}

function answerKey(row: Observation): string {
  const url = new URL(row.answer_evidence_url);
  url.hash = '';
  url.searchParams.sort();
  return url.href;
}

function interval(hits: number, samples: number): [number, number] {
  const z = 1.96;
  const rate = hits / samples;
  const denominator = 1 + z * z / samples;
  const center = (rate + z * z / (2 * samples)) / denominator;
  const margin = z * Math.sqrt((rate * (1 - rate) + z * z / (4 * samples)) / samples) / denominator;
  return [percent(Math.max(0, center - margin)), percent(Math.min(1, center + margin))];
}

function percent(rate: number): number {
  return Math.round(rate * 10_000) / 100;
}

function summarize(rows: Observation[], predicate: (row: Observation) => boolean, comparable: boolean): Rate {
  const hits = rows.filter(predicate).length;
  return {
    hits,
    samples: rows.length,
    percent: comparable ? percent(hits / rows.length) : null,
    interval_95_percent: comparable ? interval(hits, rows.length) : null,
  };
}

function citesHosts(row: Observation, hosts: Set<string>): boolean {
  return row.cited_urls.some(url => hosts.has(hostName(new URL(url).hostname)));
}

function closestCompetitor(rows: Observation[], siteHits: number, competitorHosts: Set<string>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const citedHosts = new Set(row.cited_urls.map(url => hostName(new URL(url).hostname)));
    for (const host of Array.from(citedHosts)) {
      if (competitorHosts.has(host)) counts.set(host, (counts.get(host) ?? 0) + 1);
    }
  }
  const [closest] = Array.from(counts.entries()).sort(([a, aHits], [b, bHits]) =>
    Math.abs(aHits - siteHits) - Math.abs(bHits - siteHits) || bHits - aHits || a.localeCompare(b));
  if (!closest) return null;
  const [host, hits] = closest;
  return { host, hits, samples: rows.length, percent: percent(hits / rows.length), interval_95_percent: interval(hits, rows.length) };
}

/** Calculate sampled answer coverage for one fixed panel using already-reviewed evidence. */
export function analyzeAiCitationPanel(input: unknown) {
  const data = asRecord(input);
  const config = asRecord(data?.panel);
  const siteHosts = hostSet(config?.site_hosts);
  const competitorHosts = hostSet(config?.competitor_hosts);
  if (!config || !siteHosts?.size || !competitorHosts ||
      Array.from(competitorHosts).some(host => siteHosts.has(host)) ||
      typeof config.sampling_profile !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(config.sampling_profile) ||
      !(timestamp(config.from) < timestamp(config.until)) || !Array.isArray(data?.observations)) {
    throw new Error('invalid_panel');
  }
  const panel = config as unknown as Panel;

  let rejected = 0;
  const evidence = new Map<string, Observation[]>();
  for (const inputRow of data.observations) {
    const row = parseObservation(inputRow, panel);
    if (!row) {
      rejected++;
      continue;
    }
    const key = answerKey(row);
    const records = evidence.get(key) ?? [];
    records.push(row);
    evidence.set(key, records);
  }

  const validByMeasurement = new Map<Measurement, Map<string, Observation[]>>(
    measurements.map(type => [type, new Map()]),
  );
  for (const duplicates of Array.from(evidence.values())) {
    const row = duplicates[0];
    if (duplicates.length !== 1) {
      rejected += duplicates.length;
      continue;
    }
    const providers = validByMeasurement.get(row.measurement_type)!;
    const key = row.provider.trim().replace(/ +/g, ' ').toLowerCase();
    const records = providers.get(key) ?? [];
    records.push(row);
    providers.set(key, records);
  }

  const gaps = new Map<string, { prompt_id: string; keyword: string; language: KeywordLanguage }>();
  const tiers = measurements.map(measurement_type => {
    const groups = Array.from(validByMeasurement.get(measurement_type)!.entries()).sort(([a], [b]) => a.localeCompare(b));
    const providers = groups.map(([, records]) => {
      records.sort((a, b) => timestamp(a.observed_at) - timestamp(b.observed_at) || answerKey(a).localeCompare(answerKey(b)));
      const isSearch = measurement_type !== 'model_only';
      const metrics = (rows: Observation[], comparable: boolean) => ({
        citation: isSearch ? summarize(rows, row => citesHosts(row, siteHosts), comparable) : null,
        mention: summarize(rows, row => row.mentioned, comparable),
        recommendation: summarize(rows, row => row.recommended, comparable),
      });
      const comparableRows: Observation[] = [];
      const by_prompt = promptSet.prompts.map((prompt: Prompt) => {
        const available = records.filter(row => row.prompt_id === prompt.id);
        const comparable = available.length >= minimumRepetitions;
        const rows = available.slice(0, minimumRepetitions);
        comparableRows.push(...rows);
        if (isSearch && comparable && rows.some(row => citesHosts(row, competitorHosts) && !citesHosts(row, siteHosts))) {
          const language = prompt.language as KeywordLanguage;
          if (assessKeyword(prompt.keyword, language).decision === 'accept') {
            gaps.set(prompt.id, { prompt_id: prompt.id, keyword: prompt.keyword, language });
          }
        }
        return { prompt_id: prompt.id, language: prompt.language, observations: available.length, comparable, ...metrics(rows, comparable) };
      });
      const comparable = by_prompt.every(result => result.comparable);
      const providerMetrics = metrics(comparableRows, comparable);
      return {
        provider: records[0].provider.trim(),
        observations: records.length,
        comparable,
        by_prompt,
        ...providerMetrics,
        closest_competitor: comparable && providerMetrics.citation
          ? closestCompetitor(comparableRows, providerMetrics.citation.hits, competitorHosts)
          : null,
      };
    });
    return { measurement_type, contributes_search_visibility: measurement_type !== 'model_only', providers };
  });

  return {
    prompt_version: promptSet.version,
    minimum_repetitions: minimumRepetitions,
    panel: { sampling_profile: panel.sampling_profile, from: panel.from, until: panel.until },
    valid_samples: data.observations.length - rejected,
    rejected_samples: rejected,
    tiers,
    opportunity_candidates: Array.from(gaps.values()).sort((a, b) => a.prompt_id.localeCompare(b.prompt_id)),
  };
}
