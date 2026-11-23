'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='.github/workflows';
const source=n=>fs.readFileSync(dir+'/'+n,'utf8');
const master='v3-production-orchestrator.yml';
const main=source(master);
const crons=c=>Array.from(c.matchAll(/- cron: '([^']+)'/g),m=>m[1]);
assert.deepEqual(crons(main),[],'Master native schedule must remain paused in serial validation');
assert.match(main,/name: V3 production orchestrator \(15-minute cadence\)/);
assert.match(main,/group: v3-production-orchestrator-main/);
assert.match(main,/cancel-in-progress: false/);
assert.match(main,/V3_MASTER_PAUSED != 'true'/);
assert.match(main,/^  workflow_dispatch:/m);
assert.match(main,/^  production-preflight:/m);
assert.match(main,/TRIGGER_CRON/,'Retain schedule validation logic for a later approved reactivation');
assert.match(main,/github\.event_name != 'push'/);
assert.doesNotMatch(main,/node scripts\/v3-unified-readback.cjs|no_publish=true|test-only/i,'No mock Master');
const stages={
 'market-radar':'market-radar.yml',
 'geo-intelligence':'geo-analysis.yml',
 'geo-publisher':'geo-auto-publication-daily.yml',
 'llm-feed':'llm-feed-optimization.yml',
 'maintenance':'autonomous-site-maintenance.yml'
};
for(const [job,file] of Object.entries(stages)){
 const start=main.indexOf('  '+job+':');
 assert(start>=0,'Missing real job '+job);
 assert(main.includes('uses: ./.github/workflows/'+file),'No real production action for '+job);
 const child=source(file);
 assert.match(child,/^  workflow_call:/m);
 assert.match(child,/^  workflow_dispatch:/m);
 assert.deepEqual(crons(child),[],
  'Supabase owns W02, no GitHub schedule allowed: '+file);
 assert(child.includes('scheduled-event-slot.cjs --kind='),'No real due gate for '+file);
 assert(child.includes('V3_MASTER_PAUSED'),'Pause missing in '+file);
}
const radar=main.slice(main.indexOf('  market-radar:'),main.indexOf('  geo-intelligence:'));
const geo=main.slice(main.indexOf('  geo-intelligence:'),main.indexOf('  geo-publisher:'));
const publisher=main.slice(main.indexOf('  geo-publisher:'),main.indexOf('  llm-feed:'));
const llm=main.slice(main.indexOf('  llm-feed:'),main.indexOf('  maintenance:'));
const maint=main.slice(main.indexOf('  maintenance:'),main.indexOf('  outcome:'));
assert(radar.includes('needs: production-preflight'));
assert(geo.includes('needs: [production-preflight, market-radar]')&&geo.includes('always()'));
assert(publisher.includes('needs: [production-preflight, geo-intelligence]')&&publisher.includes('always()'));
assert(!/market-radar|geo-intelligence/.test(llm),'LLM Feed improperly depends on Radar');
assert(!/market-radar|geo-intelligence/.test(maint),'Maintenance improperly depends on Radar');
const independent={
 'v3-phase2-safety-monitor.yml':[],
 'v3-stage2-quality-watch.yml':[],
 'gsc-daily-sync.yml':[]
};
for(const [file,expected] of Object.entries(independent)){
 assert.deepEqual(crons(source(file)),expected,'Independent schedule changed for '+file);
 assert.match(source(file),/^  workflow_dispatch:/m);
}
assert(source('v3-phase2-safety-monitor.yml').includes('V3 production orchestrator (15-minute cadence)'));
assert(source('v3-phase2-safety-monitor.yml').includes('node scripts/v3-master-health.cjs --mode=watchdog'));
assert(source('v3-stage2-quality-watch.yml').includes("if: github.event_name == 'schedule'"));
assert(source('gsc-daily-sync.yml').includes('gsc-scheduled-slot.cjs'));
assert(source('gsc-daily-sync.yml').includes('if-no-files-found: error'));
// Separate short-lived diagnostic is intentionally NOT a production scheduler.
const diagnostic='v3-six-minute-schedule-probe.yml';
const probe=source(diagnostic);
assert.deepEqual(crons(probe),[],'Probe must not continue background diagnostic scheduling');
assert.match(probe,/^  workflow_dispatch:/m);
assert.match(probe,/^  event-delivery-only:/m);
assert.match(probe,/permissions:\s*\n  contents: read/);
assert.doesNotMatch(probe,/uses: \.\/\.github\/workflows\/|secrets:|GEO_API_KEY|workflow_call:|curl |wget |dispatches|supabase|npm install/);
const actual=fs.readdirSync(dir).filter(x=>/\.ya?ml$/.test(x)).filter(x=>/^  schedule:\s*$/m.test(source(x))).sort();
assert.deepEqual(actual,[],'All GitHub native cron must be paused while Supabase owns W02');
assert(!fs.existsSync(dir+'/v3-schedule-delivery-sentinel.yml'),'Temporary five-minute test must be retired');
console.log('PASS production Master 15-minute events, real W01-W03/W05-W06, quota gates, independent GSC Safety Quality, no fixture Master, no 5m sentinel, isolated 6m probe');
