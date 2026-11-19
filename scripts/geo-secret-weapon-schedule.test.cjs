'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const geo=read('.github/workflows/geo-analysis.yml');
const publisher=read('.github/workflows/geo-auto-publication-daily.yml');
const radar=read('.github/workflows/market-radar.yml');
const gsc=read('.github/workflows/gsc-daily-sync.yml');
const api=read('src/app/api/admin/geo-engine/route.ts');
const ui=read('src/components/GeoEngineMonitor.tsx');
for(const hour of [1,3,5,7,9,11,13,15,17,19,21,23])
 assert(geo.includes("- cron: '0 "+hour+" * * *'"),'GEO preserves each original UTC trigger '+hour);
assert(!geo.includes("- cron: '0 2 * * 0'"),'Weekly schedule must be replaced');
assert(geo.includes('  workflow_dispatch:'),'Manual GEO dispatch must remain');
assert(geo.includes("      - '.github/workflows/geo-analysis.yml'"),'One-time main push bootstrap');
assert(geo.includes('group: geo-analysis')&&geo.includes('cancel-in-progress: false'),'No overlapping analyses');
assert(geo.includes('node scripts/opencode-geo-analysis.js --full-pipeline'),'Actual GEO pipeline preserved');
assert(geo.includes('GEO_LLM_MODE: direct'),'Four direct providers replace unreliable CLI in production');
for(const name of ['GEMINI_API_KEY','GROQ_API_KEY','NVIDIA_API_KEY','OPENROUTER_API_KEY'])
 assert(geo.includes('secrets.'+name),'Missing scoped model-provider GitHub Secret: '+name);
assert(!geo.includes('curl -fsSL https://opencode.ai'),'No OpenCode CLI download in scheduled run');
assert(geo.includes("if: always() && steps.cadence.outputs.run == 'true'"),'Partial-run reports must upload only when engine ran');
assert(geo.includes('POST -H "x-geo-api-key: $GEO_API_KEY"'),'Authenticated publishing preserved');
for(const hour of [1,3,5,7,9,11,13,15,17,19,21,23])
 assert(publisher.includes("- cron: '50 "+hour+" * * *'"),
   'Publisher must retain each of the twelve original UTC instants '+hour);
assert(!publisher.includes("- cron: '50 1-23/2 * * *'"),
 'Publisher must retain immutable per-hour scheduled event identity');
assert(publisher.includes('scheduled-event-slot.cjs --kind=publication'),
 'Delayed publisher event must use nominal GitHub event time, not runner wall clock');
assert(publisher.includes("if: steps.cadence.outputs.run == 'true'"),
 'Real publication remains gated by immutable schedule and owner policy');
for(const hour of [0,2,4,6,8,10,12,14,16,18,20,22])
 assert(radar.includes("cron: '55 "+hour+" * * *'"),'Market retains each original UTC trigger '+hour);
assert(radar.includes('scheduled-event-slot.cjs --kind=market'),'Independent market radar uses original event time');
assert(gsc.includes('gsc-scheduled-slot.cjs')&&gsc.includes('github.event.schedule'),'GSC uses immutable cron trigger');
assert(geo.includes('scheduled-event-slot.cjs --kind=geo'),'GEO uses original event time');
assert(api.includes("github('/actions/workflows/' + workflow)"),'Real GitHub workflow status must be read');
assert(api.includes("state === 'unknown' ? null : state === 'active'"),'Unknown not displayed as active');
assert(api.includes("cron_utc: '0 1-23/2 * * *'"),'Dashboard schedule matches workflow');
assert(ui.includes('التشغيل الذاتي مفعّل')&&ui.includes('تعذر تأكيد تفعيلها'),'Visible accurate schedule status');
assert(ui.includes('النشر المجدول مستقل'),'Analysis and publishing status separate');
console.log('PASS GEO Saudi burst cadence and workflow state, LLM indexing separate, publication policy intact');
