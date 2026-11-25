'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const route=fs.readFileSync('src/app/api/cron-central/route.ts','utf8');
const master=fs.readFileSync('.github/workflows/v3-production-orchestrator.yml','utf8');
const quality=fs.readFileSync('.github/workflows/v3-stage2-quality-watch.yml','utf8');
const radar=fs.readFileSync('.github/workflows/market-radar.yml','utf8');
assert.match(route,/timingSafeEqual/,'Signed Supabase clock required');
assert(route.includes('POST')&&route.includes('/api/cron-central')&&route.includes('createHmac'), 'Canonical HMAC method and path required');
assert.match(route,/mode==='capabilities'/,'Read-only diagnostic required');
assert.match(route,/mode==='one_test'/,'One explicit acceptance test required');
assert.match(route,/github_dispatch_token_missing/,'No successful fake all-system dispatch');
assert.match(route,/v3-production-orchestrator.yml/,'Reuse actual GitHub orchestrator, not fake success');
assert.match(route,/gsc-daily-sync.yml/,'Keep GSC collector');
assert.match(route,/v3-phase2-safety-monitor.yml/,'Keep safety watchdog');
assert.match(route,/v3-stage2-quality-watch.yml/,'Keep daily quality Evals');
assert.match(route,/threeHourSlots=\[0,3,6,9,12,15,18,21\]/,'Eight three-hour UTC slots required');
assert.match(route,/if\(m!==0\|\|!threeHourSlots.includes\(h\)\)return \[\]/,'One three-hour tick only');
assert.match(route,/\['W02','master','W04','safety','quality'\]/,'All production tasks dispatched on tick');
assert.match(route,/getUTCDay\(\)===0&&h===6/,'Sunday 09:00 Saudi weekly report');
assert.match(route,/weekly_report_readback_unverified/,'Weekly report must verify saved row');
assert.match(route,/recentRadarCompleted/,'Avoid Radar repeated provider usage');
assert.match(master,/inputs.source != 'supabase'/,'Supabase master must not duplicate Radar');
assert.match(master,/CENTRAL_SOURCE/,'Master reporting must accept centrally-owned Radar');
assert.match(master,/needs: \[production-preflight, market-radar\]/,'W01 dependency retained');
assert.match(master,/needs: \[production-preflight, geo-intelligence\]/,'W03 dependency retained');
assert.match(quality,/inputs.mode == 'live'/,'Quality must run on live scheduler dispatch');
assert.doesNotMatch(radar,/^  schedule:/m,'Native GitHub cron remains off');
for(const f of ['v3-production-orchestrator.yml','geo-analysis.yml','geo-auto-publication-daily.yml',
 'gsc-daily-sync.yml','llm-feed-optimization.yml','autonomous-site-maintenance.yml',
 'v3-stage2-quality-watch.yml','v3-phase2-safety-monitor.yml']){
 const c=fs.readFileSync('.github/workflows/'+f,'utf8');
 assert.doesNotMatch(c,/^  schedule:/m,f+' must not independently schedule');
}
console.log('PASS V3 single Supabase clock: signed bridge, real ordered master, GSC/safety/quality, quota and rollback guards');

const {centralRun,centralState,gscCoverage}=require('../src/lib/v3-central-health.cjs');
const slot='2026-11-24T21:00:00Z',at=Date.parse('2026-11-24T23:00:00Z');
const central={id:900,event:'workflow_dispatch',head_branch:'main',display_title:'Supabase central W04 '+slot,created_at:'2026-11-24T21:00:10Z',status:'completed',conclusion:'success'};
assert(centralRun(central,'W04'));
for(const patch of [{event:'push'},{event:'schedule'},{head_branch:'feature'},{display_title:'GSC sync (manual)'},{display_title:'Supabase central W04 2026-11-24T20:00:00Z'},{created_at:'2026-11-24T22:00:00Z'}])assert(!centralRun({...central,...patch},'W04'));
assert.equal(centralState([central],at,'W04').status,'healthy');
assert.equal(centralState([central,{...central,id:901,created_at:'2026-11-24T21:01:00Z',conclusion:'failure'}],at,'W04').status,'failed');
assert.equal(centralState([central],at+4*3600000,'W04').status,'stale');
assert.equal(centralState([{...central,status:'in_progress'}],at,'W04').status,'pending');
assert.equal(centralState([{...central,conclusion:'skipped'}],at,'W04').status,'unknown');
assert.equal(centralState([central],at,'master').status,'stale');
const saved={metric_date:'2026-11-21',checked_at:'2026-11-24T00:01:13Z',status:'success_with_data'};
assert.equal(gscCoverage(saved,'2026-11-24T23:59:00Z').state,'recent');
assert.equal(gscCoverage(saved,'2026-11-25T03:00:00Z').state,'pending');
assert.equal(gscCoverage(saved,'2026-11-25T06:00:00Z').state,'stale');
assert.equal(gscCoverage({...saved,status:'success_no_data'},'2026-11-24T23:59:00Z').state,'recent');
assert.equal(gscCoverage({...saved,status:'failed'},'2026-11-24T23:59:00Z').state,'failed');
assert.equal(gscCoverage({...saved,metric_date:'2026-11-23'},'2026-11-24T23:59:00Z').state,'unknown');
assert.match(route,/central_slot:slot/);
assert.match(master,/Supabase central master/);
assert.match(fs.readFileSync('.github/workflows/gsc-daily-sync.yml','utf8'),/Supabase central W04/);
console.log('PASS central source labels, latest failure, stale, pending and measured GSC daily coverage');

assert(route.includes("Number(req.headers.get('x-w02-cron-ts'))*1000"),'signed original timestamp rather than arrival minute');
assert(route.includes('radar_result_readback_unverified'),'verify actual saved Radar row');
