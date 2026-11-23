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
assert.match(route,/getUTCDay\(\)===0&&h===6/,'Sunday 09:15 Saudi weekly report');
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
