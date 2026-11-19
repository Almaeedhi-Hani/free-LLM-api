'use strict';

const assert = require('node:assert/strict');
const {analyzeGscOpportunities} = require('../.visibility-test-build/gsc-opportunity-analysis.js');

const property = 'https://invest.example/';
const arabicPage = property + 'services/start';
const englishPage = property + 'en/services/start';
const chinesePage = property + 'zh/services/start';
const endDate = '2026-11-16';
const row = (date, grain, keys, clicks, impressions, position) =>
  ({property, date, grain, keys, clicks, impressions, position});

const rows = [
  row('2026-10-01', 'page', [englishPage], 5, 50, 10),
  row('2026-10-20', 'page', [englishPage], 2, 25, 8),
  row('2026-11-16', 'page', [englishPage], 3, 75, 12),
  row('2026-11-16', 'page', [chinesePage], 0, 49, 9),
  row('2026-11-16', 'page', [arabicPage], 3, 60, 20),
  row('2026-11-16', 'query', ['تأسيس شركة'], 1, 50, 8),
  row('2026-11-16', 'query', ['成立公司'], 1, 50, 21),
  row('2026-11-16', 'query', ['company formation'], 10, 100, 12),
  row('2026-11-16', 'query', ['شركة LLC'], 2, 12, 14),
  row('2026-11-16', 'page_query', [arabicPage, 'تأسيس شركة'], 2, 50, 12),
  row('2026-11-16', 'page_query', [englishPage, 'تأسيس شركة'], 1, 60, 16),
  row('2026-11-16', 'page_query', [chinesePage, 'تأسيس شركة'], 0, 49, 13),
  row('2026-11-16', 'page_query', [arabicPage, 'other'], 1, 200, 14),
];
const start = Date.parse('2026-09-22T00:00:00.000Z');
const coverage = ['page', 'query', 'page_query'].flatMap(grain =>
  Array.from({length: 56}, (_, index) => {
    const date = new Date(start + index * 86_400_000).toISOString().slice(0, 10);
    return {property, grain, date, outcome: rows.some(r => r.grain === grain && r.date === date)
      ? 'complete_with_data' : 'complete_no_data'};
  })
);

const fixture = {property, endDate, rows, coverage};
const result = analyzeGscOpportunities(fixture);
assert.deepEqual(result.periods, {
  current: {from: '2026-10-20', to: '2026-11-16', days: 28},
  previous: {from: '2026-09-22', to: '2026-10-19', days: 28},
});
assert.equal(result.grains.page.status, 'available');
assert.equal(result.grains.page.coverage.current.completed_days, 28);
const english = result.grains.page.entities.find(entity => entity.page === englishPage);
assert.equal(english.page_locale, 'en');
assert.equal(english.current.impressions, 100);
assert.equal(english.current.sampled_rows, 2);
assert.equal(english.current.average_position, 11);
assert.equal(english.current.ctr, .05);
assert.deepEqual(english.change, {clicks: 0, impressions: 50, ctr: -.05, average_position: 1});
const chinese = result.grains.page.entities.find(entity => entity.page === chinesePage);
assert.equal(chinese.page_locale, 'zh');
assert.equal(chinese.previous, null);
assert.equal(chinese.change, null);
assert.equal(chinese.comparison_status, 'insufficient_data');
assert.equal(result.grains.page.entities.find(e => e.page === arabicPage).page_locale, 'ar');
assert.deepEqual(Object.fromEntries(result.grains.query.entities.map(e => [e.query, e.query_language_estimate])),
  {'تأسيس شركة': 'ar', '成立公司': 'zh', 'company formation': 'en', 'شركة LLC': 'unknown'});

assert.deepEqual(result.ctr_candidates.map(c => [c.page ?? c.query, c.estimated_additional_clicks]),
  [[englishPage, null], ['company formation', null], [arabicPage, null], ['تأسيس شركة', null]]);
assert.deepEqual(result.cannibalization_flags, [{query: 'تأسيس شركة', pages: [
  {page: englishPage, impressions: 60}, {page: arabicPage, impressions: 50},
]}]);
const benchmark = analyzeGscOpportunities({...fixture, ctrBenchmark: {name: 'Scenario', expectedCtr: .08}});
assert.equal(benchmark.ctr_benchmark.name, 'Scenario');
assert.deepEqual(benchmark.ctr_candidates.map(c => c.page ?? c.query), [englishPage, 'تأسيس شركة', arabicPage]);
assert.equal(benchmark.ctr_candidates[0].estimated_additional_clicks, 3);
assert.throws(() => analyzeGscOpportunities({...fixture, ctrBenchmark: {name: 'Scenario', expectedCtr: 1.1}}));
assert.throws(() => analyzeGscOpportunities({...fixture, endDate: '2026-02-30'}));

const duplicated = analyzeGscOpportunities({...fixture, rows: [
  ...rows, {...rows[1]}, {...rows[1], property: 'https://other.example/', impressions: 999},
]});
assert.deepEqual(duplicated, result);
const conflicting = analyzeGscOpportunities({...fixture, rows: [...rows, {...rows[1], clicks: 25}]});
assert.deepEqual(conflicting.grains.page.coverage.current.incomplete_dates, ['2026-10-20']);
assert.equal(conflicting.grains.page.entities.length, 0);
assert.equal(conflicting.grains.query.status, 'available');

const incomplete = analyzeGscOpportunities({...fixture, coverage: coverage
  .filter(c => !(c.grain === 'page_query' && c.date === '2026-10-19'))
  .map(c => c.grain === 'query' && c.date === endDate ? {...c, outcome: 'pending'} : c)});
assert.equal(incomplete.grains.page_query.status, 'insufficient_data');
assert.equal(incomplete.grains.page_query.coverage.previous.completed_days, 27);
assert.deepEqual(incomplete.cannibalization_flags, []);
assert.equal(incomplete.grains.query.status, 'insufficient_data');
assert.equal(incomplete.grains.page.status, 'available');

const noPairData = analyzeGscOpportunities({...fixture,
  rows: rows.filter(r => r.grain !== 'page_query'),
  coverage: coverage.map(c => c.grain === 'page_query' ? {...c, outcome: 'complete_no_data'} : c),
});
assert.equal(noPairData.grains.page_query.status, 'no_measured_rows');
assert.deepEqual(noPairData.cannibalization_flags, []);
assert.equal(noPairData.grains.page.status, 'available');

const inconsistent = analyzeGscOpportunities({...fixture, rows: rows.filter(r => r !== rows[0])});
assert.deepEqual(inconsistent.grains.page.coverage.previous.incomplete_dates, ['2026-10-01']);
assert.equal(inconsistent.grains.page.status, 'insufficient_data');
const failed = analyzeGscOpportunities({...fixture, coverage: coverage.map(c =>
  c.grain === 'page' && c.date === '2026-10-02' ? {...c, outcome: 'failed'} : c)});
assert.deepEqual(failed.grains.page.coverage.previous.incomplete_dates, ['2026-10-02']);
assert.equal(failed.grains.page.status, 'insufficient_data');

console.log('PASS GSC measured opportunities for complete equal periods, separate grains and paired observations');
