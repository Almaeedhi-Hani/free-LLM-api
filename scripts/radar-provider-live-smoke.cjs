'use strict';
// Manual read-only smoke: exactly one bounded provider request per language.
// Excludes database writes, scheduling, publishing, and credentials in output.
const adapter = require('../src/lib/provider-search.cjs');
const { RADAR_QUERIES } = require('../.market-test-build/radar-query-plan.js');

(async () => {
  const configured = adapter.configured();
  if (!configured.length) {
    console.error('NO_CONFIGURED_PROVIDER: no credentialed search provider available');
    process.exitCode = 2;
    return;
  }

  const languages = ['ar', 'en', 'zh'];
  const diagnostics = [];
  const results = [];
  let requestCount = 0;
  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];
    const query = RADAR_QUERIES[language][0].query;
    // Give each language a distinct starting provider, even though the shared
    // adapter receives only one language per call.
    const offset = i % configured.length;
    const providers = configured.slice(offset).concat(configured.slice(0, offset));
    const out = await adapter.search({
      queries: [{ language, query }],
      providers,
      maxCalls: 1,
      maxResults: 5,
      timeoutMs: 9000,
    });
    requestCount += out.request_count;
    diagnostics.push(...out.diagnostics);
    for (const r of out.results) {
      if (r.domain && !r.domain.endsWith('.gov.sa')) {
        results.push({
          language: r.language, domain: r.domain, source: r.source,
          query: r.query, url: r.url, verification: 'candidate',
        });
      }
    }
  }

  const covered = [...new Set(results.map(r => r.language))].sort();
  console.log(JSON.stringify({
    kind: 'credentialed_provider_smoke',
    read_only: true,
    commit_ref: process.env.GITHUB_SHA || 'local',
    checked_at: new Date().toISOString(),
    configured_providers: configured,
    request_count: requestCount,
    request_limit: 3,
    languages_checked: languages,
    languages_with_results: covered,
    unique_domains: new Set(results.map(r => r.domain)).size,
    diagnostics,
    results,
  }, null, 2));

  if (requestCount > 3) {
    console.error('FAIL: exceeded the read-only provider request budget');
    process.exitCode = 1;
  } else if (!languages.every(language => covered.includes(language))) {
    console.error('FAIL: all three languages must return non-government candidate domains');
    process.exitCode = 1;
  } else {
    console.log('PASS live credentials: AR/EN/ZH, three provider requests, candidate domains only');
  }
})().catch(e => {
  console.error(e?.message || String(e));
  process.exitCode = 1;
});
