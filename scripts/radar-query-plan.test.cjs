const assert = require('node:assert/strict');
const { RADAR_QUERIES, selectRadarQuery, radarQueryCoverage } = require('../.market-test-build/radar-query-plan.js');
const coverage = radarQueryCoverage();
assert.deepEqual(coverage, { languages: 3, anglesPerLanguage: 8, total: 24 });
for (const lang of ['ar','en','zh']) {
  assert.equal(new Set(RADAR_QUERIES[lang].map(x => x.angle)).size, 8);
  const day0 = new Date('2026-11-15T12:00:00Z');
  const results = Array.from({length:8}, (_,i) => selectRadarQuery(lang,new Date(day0.getTime()+i*86400000)));
  assert.equal(new Set(results.map(x => x.query)).size, 8, lang+' must cover eight distinct queries in eight days');
  assert.equal(results[0].query, selectRadarQuery(lang,day0).query);
}
console.log('Radar query rotation: 24 multilingual angles and deterministic daily coverage passed');
