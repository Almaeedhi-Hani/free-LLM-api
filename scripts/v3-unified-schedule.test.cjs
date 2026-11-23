'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='.github/workflows';
const master='v3-unified-sequential-test.yml';
const systems=[
 'market-radar.yml','geo-analysis.yml','geo-auto-publication-daily.yml',
 'gsc-daily-sync.yml','llm-feed-optimization.yml',
 'autonomous-site-maintenance.yml','v3-phase2-safety-monitor.yml',
 'v3-stage2-quality-watch.yml'
];
const source=fs.readFileSync(dir+'/'+master,'utf8');
assert.match(source,/^  schedule:\n    - cron: '\*\/10 \* \* \* \*'/m);
assert.match(source,/^  workflow_dispatch:/m);
assert.match(source,/group: v3-unified-sequential-testing/);
assert.match(source,/cancel-in-progress: false/);
assert.match(source,/V3_MASTER_PAUSED != 'true'/);
assert.match(source,/contents: read/);
assert.doesNotMatch(source,/contents: write|pull-requests: write|gh pr merge|gh pr create/);
assert.match(source,/GSC_CRON_SECRET/);
assert.match(source,/env -u GEO_API_KEY -u GEO_API_URL npm run test:market/,
 'offline market fixtures must not inherit production GEO credentials');
assert.match(source,/node scripts\/v3-unified-readback.cjs W04/);
const schedules=fs.readdirSync(dir).filter(x=>/\.ya?ml$/.test(x))
 .filter(x=>/^  schedule:\s*$/m.test(fs.readFileSync(dir+'/'+x,'utf8')));
assert.deepEqual(schedules,[master],'exactly one GitHub Actions workflow can define cron');
const sequence=['W02 -','W01 -','W03 -','W04 -','W05 -','W06 -',
 'Stage2 - Watchdog','Stage2 - Public quality'];
let previous=-1;
for(const name of sequence){
 const n=source.indexOf('name: '+name);
 assert(n>previous,'sequence missing or out of order: '+name);
 previous=n;
}
assert.equal((source.match(/continue-on-error: true/g)||[]).length,8,
 'all eight stages must run so later systems can be diagnosed after early failures');
assert.match(source,/Publish ordered run report and reject partial success/);
assert.match(source,/if \[ "\$fail" -ne 0 \]/);
assert.match(source,/No AI\/search API probing, visitor publishing/);
for(const name of systems){
 const text=fs.readFileSync(dir+'/'+name,'utf8');
 assert.doesNotMatch(text,/^  schedule:\s*$/m,'old automatic scheduler remains: '+name);
 assert(text.includes('workflow_dispatch:'),'manual operation removed: '+name);
}
for(const name of ['market-radar.yml','llm-feed-optimization.yml','autonomous-site-maintenance.yml']){
 const content=fs.readFileSync(dir+'/'+name,'utf8');
 assert.doesNotMatch(content,/^  push:/m,'old independent rollout push would bypass master: '+name);
}
console.log('PASS exactly one ten-minute cron, eight sequential no-write test stages, pause, no overlap, safe alerts and legacy manual operation');
