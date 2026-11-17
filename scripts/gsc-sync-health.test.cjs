'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {assessGscSyncHealth:assess,describeGscSyncStatus:describe}=require('../.visibility-test-build/gsc-sync-health.js');
const now=Date.parse('2026-11-17T12:00:00Z');
assert.equal(assess(null,now).status,'no_snapshot');
assert.equal(assess('bad',now).status,'invalid_timestamp');
assert.equal(assess('2026-11-18T12:00:00Z',now).status,'invalid_timestamp');
assert.equal(assess('2026-11-17T11:00:00Z',now).status,'recent');
assert.equal(assess('2026-11-15T11:59:00Z',now).status,'stale');
assert.equal(assess('2026-11-15T12:00:00Z',now).status,'recent');

// The UI must distinguish a recent stored snapshot from proof of a live Google sync.
for(const [status,tone] of [
 ['recent','recent'],
 ['stale','stale'],
 ['no_snapshot','no_snapshot'],
 ['invalid_timestamp','invalid_timestamp'],
 [null,'unavailable'],
 ['unrecognized','unavailable'],
]){
 const display=describe(status);
 assert.equal(display.tone,tone);
 assert(display.label&&display.description);
}
assert.match(describe('recent').description,/لا يثبت/);
assert.match(describe('stale').description,/48 ساعة/);
const panel=fs.readFileSync('src/components/VisibilityDashboard.tsx','utf8');
assert.match(panel,/history\.sync_health\?\.status/,'use the backend status instead of guessing from browser time');
assert.match(panel,/data-gsc-sync-status=/,'render a visible status indicator');
assert.match(panel,/historyLoading&&/,'show loading while reading snapshots');
assert.match(panel,/historyError&&/,'report fetch failure separately from no snapshots');
assert.match(panel,/setHistoryRefreshKey\(/,'manual refresh must re-read saved history');
console.log('PASS GSC sync freshness, dashboard statuses and failure safeguards');
