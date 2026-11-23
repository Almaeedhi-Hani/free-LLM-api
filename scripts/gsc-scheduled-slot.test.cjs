'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { scheduledSlot, chooseGscSync } = require('./gsc-scheduled-slot.cjs');

const workflow = readFileSync('.github/workflows/gsc-daily-sync.yml', 'utf8');
const crons = Array.from(workflow.matchAll(/- cron: '([^']+)'/g), match => match[1]);
// GSC has no automatic schedule after temporary acceptance testing.
assert.deepEqual(crons, []);
assert.doesNotMatch(workflow, /^  schedule:/m);
assert.deepEqual(scheduledSlot('*/5 * * * *', '2026-11-23T01:13:22Z'),
  { allowed: true, instant: '2026-11-23T01:10:00.000Z' });
assert.match(workflow, /^  workflow_dispatch:/m);
assert.deepEqual(scheduledSlot('45 0 * * *', '2026-11-23T00:46:00Z'),
  { allowed: true, instant: '2026-11-23T00:45:00.000Z' });
assert.deepEqual(scheduledSlot('0 20 * * *', '2026-11-22T01:12:00Z'),
  { allowed: true, instant: '2026-11-21T20:00:00.000Z' }); // Nov 21 KSA 23:00.
assert.deepEqual(scheduledSlot('0 22 * * *', '2026-11-22T01:12:00Z'),
  { allowed: true, instant: '2026-11-21T22:00:00.000Z' }); // Nov 22 KSA 01:00.
assert.deepEqual(scheduledSlot('0 0 * * *', '2026-11-22T02:40:00.000Z'),
  { allowed: false, instant: '2026-11-22T00:00:00.000Z' }); // Nov 22 KSA 03:00.
assert.deepEqual(scheduledSlot('0 4 * * *', '2026-11-19T04:44:14Z'),
  { allowed: true, instant: '2026-11-19T04:00:00.000Z' });
assert.throws(() => scheduledSlot('0 0-22/2 * * *', '2026-11-20T00:00:00Z'), /cron expression/);
assert.throws(() => scheduledSlot('0 0 * * *', '2026-02-30T00:00:00Z'), /timestamp/);
assert.match(workflow, /queue: max/);
assert.match(workflow, /GSC_EVENT_CRON: \$\{\{ github\.event\.schedule \}\}/);
assert.match(workflow, /actions: read/);
assert.match(workflow, /if-no-files-found: error/);
assert(workflow.indexOf('uses: actions/upload-artifact@v4') < workflow.indexOf('curl --fail-with-body'));
assert.doesNotMatch(workflow, /curl[^\n]*--retry/);

(async () => {
  const event = { event: 'schedule', schedule: '0 22 * * *', runId: '123', attempt: '1' };
  const marker = 'gsc-scheduled-slot-2026-11-21-22';
  const expectedPath = `/actions/artifacts?name=${marker}&per_page=1`;
  const instant = '2026-11-21T22:00:00.000Z';
  const runMeta = { id: 123, event: 'schedule', created_at: '2026-11-22T01:12:00Z' };
  const decision = await chooseGscSync(event, async path => {
    if (path === '/actions/runs/123') return runMeta;
    assert.equal(path, expectedPath);
    return { total_count: 0, artifacts: [] };
  });
  assert.deepEqual(decision, { run: true, reason: 'scheduled_slot', instant, marker });
  // Five-minute acceptance events must produce minute-scoped claim markers.
  const fiveMinuteEvent = { event:'schedule', schedule:'*/5 * * * *', runId:'125', attempt:'1' };
  const fiveMinuteRun = { id:125, event:'schedule', created_at:'2026-11-23T01:13:22Z' };
  assert.deepEqual(await chooseGscSync(fiveMinuteEvent, async path => {
    if (path === '/actions/runs/125') return fiveMinuteRun;
    assert.equal(path, '/actions/artifacts?name=gsc-scheduled-slot-2026-11-23-01-10&per_page=1');
    return { total_count:0, artifacts:[] };
  }), {run:true, reason:'scheduled_slot', instant:'2026-11-23T01:10:00.000Z',
    marker:'gsc-scheduled-slot-2026-11-23-01-10'});
  // A separate workflow run for the same nominal slot sees the first run's claim.
  assert.deepEqual(await chooseGscSync({ ...event, runId: '124' }, async path => {
    if (path === '/actions/runs/124') return { ...runMeta, id: 124, created_at: '2026-11-22T02:33:00Z' };
    assert.equal(path, expectedPath);
    return { total_count: 1, artifacts: [{ name: marker }] };
  }), { run: false, reason: 'already_claimed', instant });
  assert.deepEqual(await chooseGscSync({ ...event, attempt: '2' }, assert.fail),
    { run: false, reason: 'scheduled_rerun' });
  assert.deepEqual(await chooseGscSync({ event: 'workflow_dispatch' }, assert.fail),
    { run: true, reason: 'manual' });
  assert.deepEqual(await chooseGscSync({ ...event, schedule: '0 0 * * *' }, async path => {
    assert.equal(path, '/actions/runs/123');
    return runMeta;
  }), { run: false, reason: 'outside_four_hour_cadence', instant: '2026-11-22T00:00:00.000Z' });
  await assert.rejects(chooseGscSync(event, async path => {
    if (path === '/actions/runs/123') return runMeta;
    throw Error('HTTP 403');
  }), /HTTP 403/);
  await assert.rejects(chooseGscSync(event, async path => {
    if (path === '/actions/runs/123') return runMeta;
    return { total_count: 1, artifacts: [] };
  }), /Invalid GSC slot lookup/);
  console.log('PASS GSC immutable slots, Saudi cutover, delayed creation, duplicates, reruns and fail-closed claims');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
