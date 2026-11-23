'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='.github/workflows';
const source=name=>fs.readFileSync(dir+'/'+name,'utf8');
const master='v3-unified-sequential-test.yml';
const main=source(master);
const cron=c=>Array.from(c.matchAll(/- cron: '([^']+)'/g),m=>m[1]);
const fiveVariants=['3,8,13,18,23,28,33,38,43,48,53,58 * * * *','3-58/5 * * * *'];
const fiveCron=cron(main);
assert.equal(fiveCron.length,1,'Exactly one 5-minute Master schedule');
assert(fiveVariants.includes(fiveCron[0]),'Master must have the SAME twelve scheduled minutes per hour');
assert(main.includes("[ \"$TRIGGER_CRON\" != '"+fiveCron[0]+"' ]"),'Runtime scheduled event verifier must use current cron');
const gsc=[
 '0 0 * * *','45 0 * * *','0 4 * * *','0 6 * * *',
 '0 8 * * *','0 10 * * *','0 12 * * *','0 14 * * *',
 '0 16 * * *','0 18 * * *','0 20 * * *','0 22 * * *'
];
// Verify that a direct actor re-registration can switch between equivalent five-minute syntaxes.
assert.match(main,/group: v3-unified-sequential-testing/);
assert.match(main,/cancel-in-progress: false/);
assert.match(main,/V3_MASTER_PAUSED != 'true'/);
assert.match(main,/Diagnose GitHub event delivery and workflow activation/);
assert.match(main,/workflow_state=\$workflow_state/);
assert.match(main,/event=\$GITHUB_EVENT_NAME/);
assert.match(main,/^  workflow_dispatch:/m);
assert.doesNotMatch(main,/GSC_CRON_SECRET|curl[^\n]*GSC_SYNC_URL|node scripts\/v3-stage2-quality-audit.cjs|node scripts\/v3-master-health.cjs/,
 'Master must not own GSC, Safety or Quality actions');
const pipeline=main.split(/^  linked-pipeline:/m)[1]?.split(/^  llm-feed-check:/m)[0];
assert(pipeline,'Linked pipeline job absent');
const contentChecks=['W02 - Market Radar','W01 - GEO','W03 - Publisher'];
let previous=-1;
for(const phrase of contentChecks){
 const pos=pipeline.indexOf('name: '+phrase);
 assert(pos>previous,'Linked stage missing or out of order: '+phrase);
 previous=pos;
}
assert.equal((pipeline.match(/continue-on-error: true/g)||[]).length,3);
assert.match(pipeline,/Report linked content checks without masking partial failures/);
assert.match(main,/^  llm-feed-check:/m);
assert.match(main,/^  maintenance-check:/m);
assert.match(main,/^  result-summary:/m);
for(const name of ['llm-feed-check','maintenance-check']){
 const job=main.split(new RegExp('^  '+name+':','m'))[1].split(/^  [a-z-]+:/m)[0];
 assert(!/needs:\s*\[?linked-pipeline/.test(job),name+' cannot depend on Radar/GEO');
}
assert.match(main,/env -u GEO_API_KEY -u GEO_API_URL npm run test:market/);
assert.match(main,/no_publish=true/);
assert.match(main,/No new extra provider|no production AI calls/i);
const independent={
 'v3-phase2-safety-monitor.yml':['17 */6 * * *','0 6 * * 0'],
 'v3-stage2-quality-watch.yml':['23 2 * * *'],
 'gsc-daily-sync.yml':gsc
};
for(const [name,expected] of Object.entries(independent)){
 assert.deepEqual(cron(source(name)),expected,'Independent schedule missing for '+name);
 assert.match(source(name),/^  workflow_dispatch:/m,'Manual fallback removed: '+name);
}
const safety=source('v3-phase2-safety-monitor.yml');
assert(safety.includes('V3 hybrid linked pipeline and independent checks (5-minute test)'),
 'Safety must listen for Master completion');
assert(safety.includes('node scripts/v3-master-health.cjs --mode=watchdog'));
assert(safety.includes('node scripts/v3-master-health.cjs --mode=on-completion'));
assert(source('v3-stage2-quality-watch.yml').includes("if: github.event_name == 'schedule'"));
assert(source('gsc-daily-sync.yml').includes('gsc-scheduled-slot.cjs'));
assert(source('gsc-daily-sync.yml').includes('if-no-files-found: error'));
const manual=['market-radar.yml','geo-analysis.yml','geo-auto-publication-daily.yml',
 'llm-feed-optimization.yml','autonomous-site-maintenance.yml'];
for(const file of manual){
 assert.deepEqual(cron(source(file)),[],'retired standalone cron restored: '+file);
 assert.match(source(file),/^  workflow_dispatch:/m,'Manual operation removed: '+file);
}
const workflows=fs.readdirSync(dir).filter(x=>/\.ya?ml$/.test(x))
 .filter(x=>/^  schedule:\s*$/m.test(source(x))).sort();
assert.deepEqual(workflows,
 [master,'v3-phase2-safety-monitor.yml','v3-stage2-quality-watch.yml','gsc-daily-sync.yml','v3-schedule-delivery-sentinel.yml'].sort(),
 'Only four operational schedules plus temporary isolated sentinel are allowed');
const sentinel=source('v3-schedule-delivery-sentinel.yml');
assert.deepEqual(cron(sentinel),['1,6,11,16,21,26,31,36,41,46,51,56 * * * *']);
assert.match(sentinel,/^  workflow_dispatch:/m);
assert.match(sentinel,/SENTINEL REAL_GITHUB_SCHEDULE_DELIVERED/);
assert.match(sentinel,/actions: read/);
assert.match(sentinel,/gh api/);
assert.match(sentinel,/SENTINEL_REGISTRY read_only=success/);
assert.doesNotMatch(sentinel,/GSC_CRON_SECRET|GEO_API_KEY|npm ci|fetch\(|curl |issues: write|contents: write/);
console.log('PASS hybrid topology: linked W02/W01/W03; independent W05/W06, Safety (6h), Quality (daily), automatic GSC with 12 historical slots and 5-minute Master test');
