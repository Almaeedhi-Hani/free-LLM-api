process.env.ENABLE_LLM_ANALYSIS = 'true';
process.env.FREELLMAPI_ENABLED = 'true';
process.env.FREELLMAPI_API_KEY = 'dummy-key';
process.env.FREELLMAPI_BASE_URL = 'http://127.0.0.1:9999/v1';

const assert = require('assert');
let passed = 0, failed = 0;
async function atest(name, fn) {
  try { await fn(); console.log('PASS  ' + name); passed++; }
  catch (e) { console.log('FAIL  ' + name + ' -> ' + (e && e.message)); failed++; }
}
function mockFetch(payload) {
  global.fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { total_tokens: 100 }
    })
  });
}
(async () => {
  delete require.cache[require.resolve('../.geo-agent-build/feature-flags.js')];
  delete require.cache[require.resolve('../.geo-agent-build/llm-analysis.js')];
  const { analyzeEvidence } = require('../.geo-agent-build/llm-analysis.js');

  await atest('rejects empty evidence', async () => {
    const r = await analyzeEvidence([]);
    assert.strictEqual(r.opportunities.length, 0);
    assert.ok(r.error);
  });

  await atest('accepts valid output', async () => {
    mockFetch({
      opportunities: [{ title: 'Gap: MISA license', type: 'content_gap', evidence_ids: ['kw:1'], score: 70, rationale: 'based on keyword' }],
      goals: [{ title: 'Build MISA page', opportunity_index: 0, success_metrics: [{ metric: 'page_created', target: '1', measurement: 'row' }], confidence: 'high' }],
      drafts: [{ q: 'What is MISA license?', a: 'A license for foreign investors.', risk_level: 'low', evidence_ids: ['kw:1'] }]
    });
    const r = await analyzeEvidence([{ id: 'kw:1', type: 'keyword', source: 'manual', term: 'misa license', language: 'en' }]);
    assert.strictEqual(r.opportunities.length, 1);
    assert.strictEqual(r.goals.length, 1);
    assert.strictEqual(r.drafts.length, 1);
    assert.strictEqual(r.drafts[0].risk_level, 'high');
  });

  await atest('rejects fabricated evidence_ids', async () => {
    mockFetch({
      opportunities: [{ title: 'Fake gap', type: 'content_gap', evidence_ids: ['kw:999'], score: 80, rationale: 'fabricated' }],
      goals: [], drafts: []
    });
    const r = await analyzeEvidence([{ id: 'kw:1', type: 'keyword', source: 'manual', term: 'misa license', language: 'en' }]);
    assert.strictEqual(r.opportunities.length, 0);
  });

  await atest('rejects unknown domain claim', async () => {
    mockFetch({
      opportunities: [{ title: 'Gap vs unknown.com', type: 'content_gap', evidence_ids: ['kw:1'], score: 60, rationale: 'x' }],
      goals: [], drafts: []
    });
    const r = await analyzeEvidence([{ id: 'kw:1', type: 'keyword', source: 'manual', term: 'misa license', language: 'en' }]);
    assert.strictEqual(r.opportunities.length, 0);
  });

  await atest('handles HTTP failure', async () => {
    global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const r = await analyzeEvidence([{ id: 'kw:1', type: 'keyword', source: 'manual', term: 'misa', language: 'en' }]);
    assert.strictEqual(r.opportunities.length, 0);
    assert.ok(r.error);
  });

  await atest('handles invalid JSON', async () => {
    global.fetch = async () => ({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: 'not json' } }], usage: { total_tokens: 10 } })
    });
    const r = await analyzeEvidence([{ id: 'kw:1', type: 'keyword', source: 'manual', term: 'misa', language: 'en' }]);
    assert.strictEqual(r.opportunities.length, 0);
    assert.ok(r.error && r.error.includes('JSON'));
  });

  await atest('auto-flags high risk draft', async () => {
    mockFetch({
      opportunities: [], goals: [],
      drafts: [{ q: 'MISA license fees?', a: 'Fees apply.', risk_level: 'low', evidence_ids: ['kw:1'] }]
    });
    const r = await analyzeEvidence([{ id: 'kw:1', type: 'keyword', source: 'manual', term: 'misa', language: 'en' }]);
    assert.strictEqual(r.drafts.length, 1);
    assert.strictEqual(r.drafts[0].risk_level, 'high');
  });

  console.log(JSON.stringify({ status: failed === 0 ? 'PASS' : 'FAIL', passed, failed }));
})();
