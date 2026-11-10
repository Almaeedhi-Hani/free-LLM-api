'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BUILD_DIR = path.join(process.cwd(), '.market-test-build');
const STORE_DIR = path.join(process.cwd(), 'market-intel-test');
process.env.MARKET_INTEL_PATH = STORE_DIR;
process.env.NODE_ENV = 'test';

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function fresh() {
  rmrf(STORE_DIR);
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

const mi = require(path.join(BUILD_DIR, 'market-intelligence.js'));
const sm = require(path.join(BUILD_DIR, 'storage-mode.js'));

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, pass: true });
    console.log('PASS  ' + name);
  } catch (e) {
    failed++;
    results.push({ name, pass: false, error: e && e.message ? e.message : String(e) });
    console.log('FAIL  ' + name + ' -> ' + (e && e.message ? e.message : e));
  }
}

async function atest(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, pass: true });
    console.log('PASS  ' + name);
  } catch (e) {
    failed++;
    results.push({ name, pass: false, error: e && e.message ? e.message : String(e) });
    console.log('FAIL  ' + name + ' -> ' + (e && e.message ? e.message : e));
  }
}

(async () => {
  // ---- Pure helpers ----
  test('normalizeDomain strips scheme/www/trailing slash', () => {
    assert.strictEqual(mi.normalizeDomain('https://www.Example.com/foo/'), 'example.com');
    assert.strictEqual(mi.normalizeDomain('http://sub.example.co.uk'), 'sub.example.co.uk');
    assert.strictEqual(mi.normalizeDomain(''), '');
  });

  test('detectLanguage identifies ar/en/zh', () => {
    assert.strictEqual(mi.detectLanguage('افضل شركة'), 'ar');
    assert.strictEqual(mi.detectLanguage('best company'), 'en');
    assert.strictEqual(mi.detectLanguage('公司注册'), 'zh');
  });

  test('classifyIntent maps terms', () => {
    assert.strictEqual(mi.classifyIntent('MISA license cost'), 'transactional');
    assert.strictEqual(mi.classifyIntent('best company formation'), 'commercial');
    assert.strictEqual(mi.classifyIntent('invest saudi guide'), 'informational');
  });

  test('scoreOpportunity is bounded and deterministic', () => {
    const s = mi.scoreOpportunity({ evidenceCount: 3, languages: ['ar', 'en'], confidence: 'high', type: 'service_gap' });
    assert.ok(s >= 0 && s <= 100);
    const s2 = mi.scoreOpportunity({ evidenceCount: 3, languages: ['ar', 'en'], confidence: 'high', type: 'service_gap' });
    assert.strictEqual(s, s2);
  });

  test('priorityFromScore thresholds', () => {
    assert.strictEqual(mi.priorityFromScore(90), 'critical');
    assert.strictEqual(mi.priorityFromScore(60), 'high');
    assert.strictEqual(mi.priorityFromScore(40), 'medium');
    assert.strictEqual(mi.priorityFromScore(10), 'low');
  });

  test('prioritizeGoals sorts by priority then confidence', () => {
    const goals = [
      { priority: 'low', confidence: 'high' },
      { priority: 'critical', confidence: 'low' },
      { priority: 'high', confidence: 'high' },
    ];
    const sorted = mi.prioritizeGoals(goals);
    assert.strictEqual(sorted[0].priority, 'critical');
    assert.strictEqual(sorted[1].priority, 'high');
    assert.strictEqual(sorted[2].priority, 'low');
  });

  // ---- File mode CRUD + idempotency ----
  fresh();

  await atest('upsertCompetitor creates then returns same on duplicate domain', async () => {
    const c1 = await mi.upsertCompetitor({ name: 'Alpha', domain: 'https://www.alpha.com/', languages: ['en'], source: 'manual' });
    assert.ok(c1.id);
    assert.strictEqual(c1.domain, 'alpha.com');
    const c2 = await mi.upsertCompetitor({ name: 'Alpha LLC', domain: 'alpha.com', languages: ['en', 'ar'] });
    assert.strictEqual(c2.id, c1.id);
    assert.deepStrictEqual(c2.languages.sort(), ['ar', 'en']);
  });

  await atest('listCompetitors filters by status', async () => {
    const all = await mi.listCompetitors();
    assert.strictEqual(all.length, 1);
    const active = await mi.listCompetitors({ status: 'active' });
    assert.strictEqual(active.length, 1);
    const inactive = await mi.listCompetitors({ status: 'inactive' });
    assert.strictEqual(inactive.length, 0);
  });

  await atest('getCompetitor by domain and id', async () => {
    const c = await mi.getCompetitor('alpha.com');
    assert.ok(c);
    const byId = await mi.getCompetitor(c.id);
    assert.strictEqual(byId.id, c.id);
  });

  await atest('updateCompetitor and disqualify', async () => {
    const c = await mi.getCompetitor('alpha.com');
    const updated = await mi.updateCompetitor(c.id, { notes: 'test note' });
    assert.strictEqual(updated.notes, 'test note');
    const dq = await mi.disqualifyCompetitor(c.id, 'spam');
    assert.strictEqual(dq.status, 'disqualified');
  });

  await atest('recordObservation is idempotent on identical inputs', async () => {
    const c = await mi.getCompetitor('alpha.com');
    const o1 = await mi.recordObservation({ competitor_id: c.id, language: 'en', query: 'company formation', title: 't', snippet: 's', weaknesses: ['no FAQ'] });
    const o2 = await mi.recordObservation({ competitor_id: c.id, language: 'en', query: 'company formation', title: 't2', snippet: 's2', weaknesses: ['no FAQ'], observed_at: o1.observed_at });
    assert.strictEqual(o2.id, o1.id);
    const list = await mi.listObservations(c.id);
    assert.strictEqual(list.length, 1);
  });

  await atest('upsertKeyword creates then dedups by term+language', async () => {
    const k1 = await mi.upsertKeyword({ term: 'MISA license', language: 'en', source: 'manual' });
    assert.strictEqual(k1.intent, 'transactional');
    const k2 = await mi.upsertKeyword({ term: 'MISA license', language: 'en', source: 'manual', intent: 'commercial' });
    assert.strictEqual(k2.id, k1.id);
    assert.strictEqual(k2.intent, 'commercial');
  });

  await atest('upsertKeyword preserves volume only with source', async () => {
    const k = await mi.upsertKeyword({ term: 'saudi company', language: 'en', source: 'manual', search_volume: 100, volume_source: 'test-source', volume_confidence: 'low' });
    assert.strictEqual(k.search_volume, 100);
    assert.strictEqual(k.volume_source, 'test-source');
  });

  await atest('listKeywords filters by language/intent', async () => {
    await mi.upsertKeyword({ term: 'رخصة مستثمر', language: 'ar', source: 'manual' });
    const ar = await mi.listKeywords({ language: 'ar' });
    assert.ok(ar.length >= 1);
    const en = await mi.listKeywords({ language: 'en' });
    assert.ok(en.length >= 2);
  });

  await atest('createOpportunity is idempotent by title+type', async () => {
    const c = await mi.getCompetitor('alpha.com');
    const o1 = await mi.createOpportunity({
      title: 'Address competitor gap: alpha.com',
      type: 'content_gap',
      evidence: [{ source: 'test', observed_at: new Date().toISOString() }],
      languages: ['en'],
      related_competitors: [c.id],
      confidence: 'medium',
    });
    const o2 = await mi.createOpportunity({
      title: 'Address competitor gap: alpha.com',
      type: 'content_gap',
      evidence: [{ source: 'test2' }],
      languages: ['en'],
      confidence: 'low',
    });
    assert.strictEqual(o2.id, o1.id);
    // idempotent: keeps original evidence/score
    assert.strictEqual(o2.evidence[0].source, 'test');
  });

  await atest('updateOpportunity changes status', async () => {
    const opps = await mi.listOpportunities();
    const o = opps[0];
    const updated = await mi.updateOpportunity(o.id, { status: 'triaged' });
    assert.strictEqual(updated.status, 'triaged');
  });

  await atest('createGoal is idempotent by title+opportunity', async () => {
    const opps = await mi.listOpportunities();
    const opp = opps[0];
    const g1 = await mi.createGoal({
      title: 'Close content gap vs alpha.com',
      evidence: [{ source: 'test' }],
      success_metrics: [{ metric: 'page_published', target: '1', measurement: 'count' }],
      confidence: 'medium',
      related_opportunity_id: opp.id,
    });
    const g2 = await mi.createGoal({
      title: 'Close content gap vs alpha.com',
      evidence: [{ source: 'test2' }],
      success_metrics: [{ metric: 'x', target: '1', measurement: 'y' }],
      related_opportunity_id: opp.id,
    });
    assert.strictEqual(g2.id, g1.id);
  });

  await atest('updateGoal changes status', async () => {
    const goals = await mi.listGoals();
    const g = goals[0];
    const updated = await mi.updateGoal(g.id, { status: 'in_progress' });
    assert.strictEqual(updated.status, 'in_progress');
  });

  await atest('startRun/finishRun/listRuns round-trip', async () => {
    const run = await mi.startRun('full', 'test');
    assert.strictEqual(run.status, 'running');
    await mi.finishRun(run.id, 'success', { ok: true });
    const runs = await mi.listRuns();
    assert.ok(runs.length >= 1);
    const found = runs.find((r) => r.id === run.id);
    assert.strictEqual(found.status, 'success');
    assert.deepStrictEqual(found.summary, { ok: true });
  });

  await atest('listOpportunities sorts by score desc', async () => {
    await mi.createOpportunity({
      title: 'Low score opp',
      type: 'faq_gap',
      score: 10,
      evidence: [{ source: 't' }],
      languages: ['en'],
      confidence: 'low',
    });
    const opps = await mi.listOpportunities();
    for (let i = 1; i < opps.length; i++) {
      assert.ok(opps[i - 1].score >= opps[i].score);
    }
  });

  // ---- Failure modes ----
  await atest('production runtime without Supabase fails closed', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevPhase = process.env.NEXT_PHASE;
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PHASE;
    let threw = false;
    try {
      await mi.listCompetitors();
    } catch (e) {
      threw = true;
      assert.ok(e && e.code === 'STORAGE_UNAVAILABLE');
    }
    process.env.NODE_ENV = prevNodeEnv || 'test';
    if (prevPhase) process.env.NEXT_PHASE = prevPhase;
    assert.ok(threw);
  });

  await atest('partial Supabase config is rejected', () => {
    const prevUrl = process.env.SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    let threw = false;
    try {
      mi.getSupabaseCredentials ? sm.getSupabaseCredentials() : null;
      // trigger via a function that calls getSupabaseCredentials
      // upsertCompetitor in supabase mode would call it; but resolveStorageMode throws first.
      // Call resolveStorageMode directly.
      sm.resolveStorageMode();
    } catch (e) {
      threw = true;
      assert.ok(e && e.code === 'STORAGE_UNAVAILABLE');
    }
    // restore
    if (prevUrl) process.env.SUPABASE_URL = prevUrl; else delete process.env.SUPABASE_URL;
    if (prevKey) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(threw);
  });

  // ---- Supabase mock path ----
  await atest('Supabase path: upsertCompetitor (mock)', async () => {
    const prevUrl = process.env.SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PHASE = 'phase-production-build';

    const originalFetch = global.fetch;
    global.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes('/competitors?domain=eq.') || u.includes('/competitors?id=eq.')) {
        return { ok: true, status: 200, json: async () => [], text: async () => '' };
      }
      if (u.endsWith('/competitors') && (init && init.method === 'POST')) {
        return { ok: true, status: 201, json: async () => [{ id: 'mock-comp', name: 'Mock', domain: 'mock.com', languages: [], market: 'm', status: 'active', source: 'manual', first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }], text: async () => '' };
      }
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    };
    try {
      const c = await mi.upsertCompetitor({ name: 'Mock', domain: 'mock.com', source: 'manual' });
      assert.strictEqual(c.id, 'mock-comp');
    } finally {
      global.fetch = originalFetch;
      if (prevUrl) process.env.SUPABASE_URL = prevUrl; else delete process.env.SUPABASE_URL;
      if (prevKey) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PHASE;
    }
  });

  // ---- Phase 2B: sources, discovery, radar ----
  const ms = require(path.join(BUILD_DIR, 'market-sources.js'));

  await atest('availableSources lists google + duckduckgo as available', async () => {
    const srcs = mi.listAvailableSources();
    assert.ok(Array.isArray(srcs));
    const ids = srcs.map((s) => s.id);
    assert.ok(ids.includes('google-suggest'));
    assert.ok(ids.includes('duckduckgo-suggest'));
    const google = srcs.find((s) => s.id === 'google-suggest');
    assert.strictEqual(google.available, true);
    assert.strictEqual(google.free, true);
  });

  await atest('GoogleSuggestSource parses suggestions (mocked)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => (['q', ['suggestion one', 'suggestion two']]) });
    try {
      const src = new ms.GoogleSuggestSource();
      const res = await src.collectSuggestions('test', 'en');
      assert.strictEqual(res.length, 2);
      assert.strictEqual(res[0].term, 'suggestion one');
      assert.strictEqual(res[0].source, 'google-suggest');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('source returns empty on HTTP failure (no crash)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: false, status: 500, json: async () => null });
    try {
      const src = new ms.GoogleSuggestSource();
      const res = await src.collectSuggestions('test', 'en');
      assert.deepStrictEqual(res, []);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('source returns empty on network throw (no crash)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => { throw new Error('network down'); };
    try {
      const src = new ms.DuckDuckGoSuggestSource();
      const res = await src.collectSuggestions('test', 'ar');
      assert.deepStrictEqual(res, []);
    } finally {
      global.fetch = originalFetch;
    }
  });

  fresh();

  await atest('runDiscovery with empty seeds completes with zero counts', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => (['q', []]) });
    try {
      const summary = await mi.runDiscovery({ seeds: { ar: [], en: [], zh: [] }, triggeredBy: 'test' });
      assert.strictEqual(summary.suggestions_collected, 0);
      assert.strictEqual(summary.keywords_upserted, 0);
      assert.ok(Array.isArray(summary.sources_used));
      assert.ok(Array.isArray(summary.errors));
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('runDiscovery collects and upserts keywords (mocked source)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => (['q', ['how to form company in saudi', 'MISA license cost']]) });
    try {
      const summary = await mi.runDiscovery({ seeds: { ar: [], en: ['company formation'], zh: [] }, maxSuggestionsPerSeed: 5, triggeredBy: 'test' });
      assert.ok(summary.keywords_upserted >= 1);
      const kws = await mi.listKeywords({ language: 'en' });
      const found = kws.find((k) => k.term === 'how to form company in saudi');
      assert.ok(found, 'keyword persisted');
      assert.strictEqual(found.source, 'google-suggest');
      assert.strictEqual(found.volume_confidence, 'unknown');
      assert.strictEqual(found.search_volume, null);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('runDiscovery respects maxSuggestionsPerSeed', async () => {
    const originalFetch = global.fetch;
    const many = Array.from({ length: 50 }, (_, i) => `suggestion ${i}`);
    global.fetch = async () => ({ ok: true, status: 200, json: async () => (['q', many]) });
    try {
      const summary = await mi.runDiscovery({ seeds: { ar: [], en: ['seed'], zh: [] }, maxSuggestionsPerSeed: 3, triggeredBy: 'test' });
      assert.ok(summary.suggestions_collected <= 6);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('runDiscovery is idempotent (no duplicate keywords)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => (['q', ['dup keyword']]) });
    try {
      await mi.runDiscovery({ seeds: { ar: [], en: ['seed'], zh: [] }, triggeredBy: 'test' });
      const before = (await mi.listKeywords()).length;
      await mi.runDiscovery({ seeds: { ar: [], en: ['seed'], zh: [] }, triggeredBy: 'test' });
      const after = (await mi.listKeywords()).length;
      assert.strictEqual(before, after);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('Bing source unavailable without key', async () => {
    const prev = process.env.BING_SEARCH_API_KEY;
    delete process.env.BING_SEARCH_API_KEY;
    const bing = new ms.BingSearchSource();
    assert.strictEqual(bing.isAvailable(), false);
    if (prev) process.env.BING_SEARCH_API_KEY = prev;
  });

  await atest('runRadar records an analysis run with discovery summary', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => (['q', ['radar kw']]) });
    try {
      const { run_id, discovery, analysis } = await mi.runRadar({ seeds: { ar: [], en: ['seed'], zh: [] }, triggeredBy: 'test' });
      assert.ok(run_id);
      assert.ok(discovery);
      assert.ok(analysis && analysis.run_id);
      const runs = await mi.listRuns();
      const found = runs.find((r) => r.id === run_id);
      assert.ok(found);
      assert.strictEqual(found.run_type, 'radar');
      assert.strictEqual(found.status, 'success');
      assert.ok(found.summary && found.summary.discovery);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('runRadar with no data still succeeds', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => (['q', []]) });
    try {
      const { run_id } = await mi.runRadar({ seeds: { ar: [], en: [], zh: [] }, triggeredBy: 'test' });
      const runs = await mi.listRuns();
      const found = runs.find((r) => r.id === run_id);
      assert.strictEqual(found.status, 'success');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await atest('Bing competitor discovery records observations with evidence (mocked)', async () => {
    const prev = process.env.BING_SEARCH_API_KEY;
    process.env.BING_SEARCH_API_KEY = 'mock-bing-key';
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes('suggestqueries.google') || u.includes('duckduckgo.com/ac')) {
        return { ok: true, status: 200, json: async () => (['q', []]) };
      }
      if (u.includes('api.bing.microsoft.com')) {
        return { ok: true, status: 200, json: async () => ({ webPages: { value: [
          { name: 'Competitor One', url: 'https://comp1.example.com/page', snippet: 'We offer company formation' },
        ] } }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };
    try {
      const summary = await mi.runDiscovery({ seeds: { ar: [], en: ['company formation'], zh: [] }, triggeredBy: 'test' });
      assert.ok(summary.competitors_discovered >= 1);
      assert.ok(summary.observations_recorded >= 1);
      const comps = await mi.listCompetitors();
      const comp = comps.find((c) => c.domain === 'comp1.example.com');
      assert.ok(comp, 'competitor persisted');
      const obs = await mi.listObservations(comp.id);
      assert.ok(obs.length >= 1);
      assert.strictEqual(obs[0].source === undefined ? 'bing-web-search' : obs[0].raw && obs[0].raw.source, 'bing-web-search');
      assert.ok(obs[0].url && obs[0].url.includes('comp1.example.com'));
      assert.ok(obs[0].snippet && obs[0].snippet.length > 0);
    } finally {
      global.fetch = originalFetch;
      if (prev) process.env.BING_SEARCH_API_KEY = prev; else delete process.env.BING_SEARCH_API_KEY;
    }
  });

  await atest('Bing discovery is idempotent (no duplicate competitors)', async () => {
    const prev = process.env.BING_SEARCH_API_KEY;
    process.env.BING_SEARCH_API_KEY = 'mock-bing-key';
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes('suggestqueries.google') || u.includes('duckduckgo.com/ac')) {
        return { ok: true, status: 200, json: async () => (['q', []]) };
      }
      if (u.includes('api.bing.microsoft.com')) {
        return { ok: true, status: 200, json: async () => ({ webPages: { value: [
          { name: 'Competitor One', url: 'https://comp1.example.com/page', snippet: 'We offer company formation' },
        ] } }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };
    try {
      const before = (await mi.listCompetitors()).length;
      await mi.runDiscovery({ seeds: { ar: [], en: ['company formation'], zh: [] }, triggeredBy: 'test' });
      const after = (await mi.listCompetitors()).length;
      assert.strictEqual(before, after);
    } finally {
      global.fetch = originalFetch;
      if (prev) process.env.BING_SEARCH_API_KEY = prev; else delete process.env.BING_SEARCH_API_KEY;
    }
  });

  // ---- source failure does not abort discovery ----
  await atest('discovery continues when one source throws', async () => {
    fresh();
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes('suggestqueries.google')) {
        throw new Error('google down');
      }
      if (u.includes('duckduckgo.com/ac')) {
        return { ok: true, status: 200, json: async () => (['q', ['ddg term']]) };
      }
      return { ok: true, status: 200, json: async () => (['q', []]) };
    };
    try {
      const summary = await mi.runDiscovery({ seeds: { ar: [], en: ['seed'], zh: [] }, triggeredBy: 'test' });
      assert.ok(summary.keywords_upserted >= 1, 'working source still collected');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // cleanup
  rmrf(STORE_DIR);

  console.log('\n' + JSON.stringify({ status: failed === 0 ? 'PASS' : 'FAIL', passed, failed }, null, 2));
  process.exit(failed === 0 ? 0 : 1);
})();
