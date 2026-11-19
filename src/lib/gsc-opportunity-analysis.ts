import {summarizeGscPerformance} from './gsc-measured-performance';
import type {GscPerformanceRow, GscMeasuredSummary} from './gsc-measured-performance';

const DIMENSIONS = {page: ['page'], query: ['query'], page_query: ['page', 'query']} as const;
const PERIOD_DAYS = 28;
const MS_PER_DAY = 86_400_000;
const MIN_IMPRESSIONS = 50;

export type GscOpportunityGrain = keyof typeof DIMENSIONS;
type Locale = 'ar' | 'en' | 'zh' | 'unknown';
type PeriodSummary = Pick<GscMeasuredSummary, 'clicks' | 'impressions' | 'ctr' | 'average_position' | 'sampled_rows'>;
type DailyOutcome = 'complete_with_data' | 'complete_no_data' | 'pending' | 'failed';
type Measurement = GscPerformanceRow & {property: string; date: string; grain: GscOpportunityGrain};

export interface GscOpportunityInput {
  property: string;
  /** Last eligible GSC metric date. The caller determines freshness. */
  endDate: string;
  rows: readonly Measurement[];
  /** Supply per-grain finalized coverage from collection, never inferred from site totals or absent rows. */
  coverage: readonly {property: string; date: string; grain: GscOpportunityGrain; outcome: DailyOutcome}[];
  ctrBenchmark?: {name: string; expectedCtr: number};
}

function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function queryLocale(query: string): Locale {
  const present = [
    [/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(query), 'ar'],
    [/[A-Za-z]/.test(query), 'en'],
    [/[\u3400-\u4dbf\u4e00-\u9fff]/.test(query), 'zh'],
  ] as const;
  const scripts = present.filter(([found]) => found);
  return scripts.length === 1 ? scripts[0][1] : 'unknown';
}

function pageLocale(page: string, property: string): Locale {
  try {
    const url = new URL(page);
    const domain = property.startsWith('sc-domain:') ? property.slice('sc-domain:'.length) : null;
    if (!['http:', 'https:'].includes(url.protocol)) return 'unknown';
    const sameProperty = domain
      ? url.hostname === domain || url.hostname.endsWith('.' + domain)
      : url.origin === new URL(property).origin && url.href.startsWith(property);
    if (!sameProperty) return 'unknown';
    const prefix = url.pathname.split('/')[1];
    return prefix === 'en' || prefix === 'zh' ? prefix : 'ar';
  } catch {
    return 'unknown';
  }
}

function summarize(rows: readonly Measurement[], grain: GscOpportunityGrain): PeriodSummary | null {
  if (!rows.length) return null;
  const {clicks, impressions, ctr, average_position, sampled_rows} =
    summarizeGscPerformance(rows, DIMENSIONS[grain]);
  return {clicks, impressions, ctr, average_position, sampled_rows};
}

function grainAnalysis(
  input: GscOpportunityInput,
  grain: GscOpportunityGrain,
  currentDates: readonly string[],
  previousDates: readonly string[],
) {
  const allowedDates = new Set([...currentDates, ...previousDates]);
  const outcomes = new Map<string, DailyOutcome>();
  const observations = new Map<string, Map<string, Measurement>>();
  const invalidDates = new Set<string>();

  for (const {property, date, grain: coveredGrain, outcome} of input.coverage) {
    if (property !== input.property || coveredGrain !== grain || !allowedDates.has(date)) continue;
    if (outcomes.has(date) && outcomes.get(date) !== outcome) invalidDates.add(date);
    outcomes.set(date, outcome);
  }

  for (const row of input.rows) {
    if (row.property !== input.property || row.grain !== grain || !allowedDates.has(row.date)) continue;
    try {
      summarizeGscPerformance([row], DIMENSIONS[grain]);
      if (row.keys.some(key => !key.trim())) throw Error('Empty GSC key');
    } catch {
      invalidDates.add(row.date);
      continue;
    }
    const byKey = observations.get(row.date) ?? new Map<string, Measurement>();
    const key = JSON.stringify(row.keys);
    const existing = byKey.get(key);
    if (existing && (existing.clicks !== row.clicks || existing.impressions !== row.impressions ||
      existing.position !== row.position)) invalidDates.add(row.date);
    byKey.set(key, row);
    observations.set(row.date, byKey);
  }

  function windowCoverage(dates: readonly string[]) {
    const incomplete_dates = dates.filter(date => {
      const outcome = outcomes.get(date);
      const hasRows = observations.has(date);
      return invalidDates.has(date) || (outcome === 'complete_with_data' ? !hasRows :
        outcome !== 'complete_no_data' || hasRows);
    });
    return {completed_days: dates.length - incomplete_dates.length, incomplete_dates};
  }

  const coverage = {current: windowCoverage(currentDates), previous: windowCoverage(previousDates)};
  const complete = !coverage.current.incomplete_dates.length && !coverage.previous.incomplete_dates.length;
  const entityRows = new Map<string, {current: Measurement[]; previous: Measurement[]}>();

  if (complete) {
    for (const [period, dates] of [['current', currentDates], ['previous', previousDates]] as const) {
      for (const date of dates) {
        for (const [key, row] of Array.from(observations.get(date)?.entries() ?? [])) {
          const entity = entityRows.get(key) ?? {current: [], previous: []};
          entity[period].push(row);
          entityRows.set(key, entity);
        }
      }
    }
  }

  const entities = Array.from(entityRows.entries()).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, entity]) => {
      const keys = JSON.parse(key) as string[];
      const page = grain === 'query' ? null : keys[0];
      const query = grain === 'page' ? null : keys[grain === 'query' ? 0 : 1];
      const current = summarize(entity.current, grain);
      const previous = summarize(entity.previous, grain);
      const sufficient = current && previous && current.impressions >= MIN_IMPRESSIONS &&
        previous.impressions >= MIN_IMPRESSIONS;
      return {
        keys, page, query,
        page_locale: page ? pageLocale(page, input.property) : null,
        query_language_estimate: query ? queryLocale(query) : null,
        current, previous,
        comparison_status: sufficient ? 'available' as const : 'insufficient_data' as const,
        change: sufficient ? {
          clicks: current.clicks - previous.clicks,
          impressions: current.impressions - previous.impressions,
          ctr: current.ctr! - previous.ctr!,
          average_position: current.average_position! - previous.average_position!,
        } : null,
      };
    });
  const status = !complete ? 'insufficient_data' : entities.length ? 'available' : 'no_measured_rows';
  return {status, coverage, entities} as const;
}

/** Analyze each stored grain independently. Only finalized, complete periods
 * can produce comparisons. Entity rows absent from Google remain unknown. */
export function analyzeGscOpportunities(input: GscOpportunityInput) {
  const end = Date.parse(input.endDate + 'T00:00:00.000Z');
  if (!Number.isFinite(end) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate) || isoDate(end) !== input.endDate) {
    throw Error('Invalid GSC analysis end date');
  }
  if (!input.property.trim()) throw Error('Missing GSC property');
  const benchmark = input.ctrBenchmark;
  if (benchmark && (!benchmark.name.trim() || !Number.isFinite(benchmark.expectedCtr) ||
    benchmark.expectedCtr < 0 || benchmark.expectedCtr > 1)) throw Error('Invalid CTR benchmark');

  const dates = Array.from({length: PERIOD_DAYS * 2}, (_, index) => isoDate(end - (PERIOD_DAYS * 2 - 1 - index) * MS_PER_DAY));
  const previousDates = dates.slice(0, PERIOD_DAYS);
  const currentDates = dates.slice(PERIOD_DAYS);
  const grains = {
    page: grainAnalysis(input, 'page', currentDates, previousDates),
    query: grainAnalysis(input, 'query', currentDates, previousDates),
    page_query: grainAnalysis(input, 'page_query', currentDates, previousDates),
  };

  const ctr_candidates = (['page', 'query'] as const).flatMap(grain =>
    grains[grain].entities.flatMap(({page, query, current}) => {
      if (!current || current.impressions < MIN_IMPRESSIONS || current.average_position === null ||
        current.average_position < 8 || current.average_position > 20 || current.ctr === null) return [];
      const additionalClicks = benchmark ? (benchmark.expectedCtr - current.ctr) * current.impressions : null;
      if (additionalClicks !== null && additionalClicks <= 0) return [];
      return [{grain, page, query, impressions: current.impressions, ctr: current.ctr,
        average_position: current.average_position, estimated_additional_clicks: additionalClicks}];
    })
  ).sort((a, b) => (b.estimated_additional_clicks ?? 0) - (a.estimated_additional_clicks ?? 0) ||
    b.impressions - a.impressions);

  const pairedByQuery = new Map<string, Array<{page: string; impressions: number}>>();
  for (const {page, query, current} of grains.page_query.entities) {
    if (!page || !query || !current || current.impressions < MIN_IMPRESSIONS) continue;
    const pages = pairedByQuery.get(query) ?? [];
    pages.push({page, impressions: current.impressions});
    pairedByQuery.set(query, pages);
  }
  const cannibalization_flags = Array.from(pairedByQuery.entries())
    .filter(([, pages]) => pages.length > 1)
    .map(([query, pages]) => ({query, pages: pages.sort((a, b) => b.impressions - a.impressions)}));

  return {
    source: 'google_search_console' as const,
    property: input.property,
    periods: {
      current: {from: currentDates[0], to: currentDates[PERIOD_DAYS - 1], days: PERIOD_DAYS},
      previous: {from: previousDates[0], to: previousDates[PERIOD_DAYS - 1], days: PERIOD_DAYS},
    },
    min_impressions: MIN_IMPRESSIONS,
    grains,
    ctr_benchmark: benchmark ?? null,
    ctr_candidates,
    cannibalization_flags,
  };
}
