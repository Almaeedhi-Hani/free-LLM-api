'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { analyzeAiCitationPanel } = require('../.ai-radar-test-build/src/lib/ai-citation-radar.js');
const { version, prompts } = require('../geo/prompt-set.json');

const panel = {
  from: '2026-11-01T00:00:00Z',
  until: '2026-12-01T00:00:00Z',
  sampling_profile: 'sa-desktop-fresh',
  site_hosts: ['www.invest.example'],
  competitor_hosts: ['peer.example', 'less-close.example'],
};
let n = 0;
function row(prompt, changes = {}) {
  return {
    provider: 'Example Search',
    measurement_type: 'manual_ai_search',
    prompt_version: version,
    prompt_id: prompt.id,
    prompt_text: prompt.text,
    sampling_profile: panel.sampling_profile,
    observed_at: '2026-11-10T08:00:00Z',
    answer_evidence_url: 'https://evidence.example/reviewed-answer-' + n++,
    evidence_reviewed: true,
    cited_urls: [],
    mentioned: false,
    recommended: false,
    ...changes,
  };
}
const report = observations => analyzeAiCitationPanel({ panel, observations });
const tier = (result, mode) => result.tiers.find(value => value.measurement_type === mode);
const sample = prompts[0];
const competitor = { cited_urls: ['https://peer.example/services'], mentioned: true, recommended: false };

assert.equal(prompts.length, 12);
assert.equal(new Set(prompts.map(prompt => prompt.id)).size, prompts.length);
for (const language of ['ar', 'en', 'zh']) assert.equal(prompts.filter(prompt => prompt.language === language).length, 4);

const empty = report([]);
assert.equal(empty.valid_samples, 0);
assert.deepEqual(empty.tiers.map(value => value.providers.length), [0, 0, 0]);

const partial = report([row(sample, competitor), row(sample, competitor)]);
const partialProvider = tier(partial, 'manual_ai_search').providers[0];
assert.equal(partialProvider.citation.percent, null);
assert.equal(partialProvider.by_prompt[0].citation.percent, null);
assert.equal(partial.opportunity_candidates.length, 0);

const completePanel = prompts.flatMap((prompt, i) => [
  row(prompt, { cited_urls: ['https://invest.example/' + prompt.id], mentioned: true, recommended: true, recommendation_reason: 'Explicit recommendation with reasons' }),
  row(prompt, i === 0 ? { ...competitor, cited_urls: [...competitor.cited_urls, 'https://less-close.example/services'] } :
    i < 3 ? { cited_urls: ['https://peer.example/services', 'https://peer.example/another-page'] } : {}),
  row(prompt, { cited_urls: ['https://invest.example.evil.example/fake'] }),
]);
const extra = [
  row(sample, { cited_urls: ['https://invest.example/extra'], observed_at: '2026-11-11T08:00:00Z' }),
  ...Array.from({ length: 3 }, () => row(sample, { measurement_type: 'search_grounded', grounding_evidence_url: 'https://trace.example/results' })),
  ...Array.from({ length: 3 }, () => row(sample, { measurement_type: 'model_only', mentioned: true })),
];
const full = report([...completePanel, ...extra].reverse());
const manual = tier(full, 'manual_ai_search').providers[0];
assert.equal(manual.comparable, true);
assert.equal(manual.observations, 37);
assert.deepEqual([manual.citation.hits, manual.citation.samples, manual.citation.percent], [12, 36, 33.33]);
assert.equal(manual.mention.hits, 13);
assert.equal(manual.recommendation.hits, 12);
assert(manual.citation.interval_95_percent[0] < manual.citation.percent);
assert(manual.citation.interval_95_percent[1] > manual.citation.percent);
assert(full.opportunity_candidates.some(candidate => candidate.prompt_id === sample.id));
assert.deepEqual(
  [manual.closest_competitor.host, manual.closest_competitor.hits, manual.closest_competitor.samples],
  ['peer.example', 3, 36],
);
assert.equal(partialProvider.closest_competitor, null);
assert.equal(tier(full, 'search_grounded').providers[0].by_prompt[0].citation.percent, 0);
const experimental = tier(full, 'model_only');
assert.equal(experimental.contributes_search_visibility, false);
assert.equal(experimental.providers[0].by_prompt[0].citation, null);
assert.equal(experimental.providers[0].by_prompt[0].mention.percent, 100);

const duplicate = row(sample);
const rejected = [
  duplicate,
  { ...duplicate, measurement_type: 'model_only', answer_evidence_url: duplicate.answer_evidence_url + '#copy' },
  row(sample, { evidence_reviewed: false }),
  row(sample, { prompt_version: 0 }),
  row(sample, { prompt_text: 'Changed question' }),
  row(sample, { observed_at: '2026-11-31T08:00:00Z' }),
  row(sample, { observed_at: panel.until }),
  row(sample, { sampling_profile: 'another-profile' }),
  row(sample, { measurement_type: 'search_grounded' }),
  row(sample, { measurement_type: 'model_only', cited_urls: ['https://invest.example'] }),
  row(sample, { recommended: true, mentioned: true }),
  row(sample, { answer_evidence_url: 'https://user:password@evidence.example/answer' }),
  row(sample, { cited_urls: ['https://127.0.0.1'] }),
];
assert.equal(report(rejected).rejected_samples, rejected.length);
assert.throws(() => analyzeAiCitationPanel({ panel: { ...panel, competitor_hosts: ['invest.example'] }, observations: [] }), /invalid_panel/);

const cli = spawnSync(process.execPath, ['scripts/ai-citation-radar.cjs'], {
  input: JSON.stringify({ panel, observations: [] }),
  encoding: 'utf8',
});
assert.equal(cli.status, 0, cli.stderr);
assert.deepEqual(JSON.parse(cli.stdout), empty);
assert(!JSON.stringify(full).includes('https://peer.example'));
console.log('PASS independent AI citation evidence tiers, sampling thresholds, quality gate and offline report');
