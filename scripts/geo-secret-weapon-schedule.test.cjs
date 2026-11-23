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
assert.doesNotMatch(geo,/^  schedule:/m,'GEO now uses the unified single scheduler');
assert(!geo.includes("- cron: '0 2 * * 0'"),'Weekly schedule must be replaced');
assert(geo.includes('  workflow_dispatch:'),'Manual GEO dispatch must remain');
// That one-time bootstrap caused a real W01 provider run after PR #245 merged.
assert(!/^  push:\s*$/m.test(geo),'W01 must never invoke model/search providers just because a commit merged');
assert(geo.includes('  workflow_dispatch:'),'Explicit operator-run path remains available');
assert(geo.includes('group: geo-analysis')&&geo.includes('cancel-in-progress: false'),'No overlapping analyses');
assert(geo.includes('node scripts/opencode-geo-analysis.js --full-pipeline'),'Actual GEO pipeline preserved');
assert(geo.includes('GEO_LLM_MODE: direct'),'Four direct providers replace unreliable CLI in production');
for(const name of ['GEMINI_API_KEY','GROQ_API_KEY','NVIDIA_API_KEY','OPENROUTER_API_KEY'])
 assert(geo.includes('secrets.'+name),'Missing scoped model-provider GitHub Secret: '+name);
assert(!geo.includes('curl -fsSL https://opencode.ai'),'No OpenCode CLI download in scheduled run');
assert(geo.includes("if: always() && steps.cadence.outputs.run == 'true'"),'Partial-run reports must upload only when engine ran');
assert(geo.includes('POST -H "x-geo-api-key: $GEO_API_KEY"'),'Authenticated publishing preserved');
assert.doesNotMatch(publisher,/^  schedule:/m,'publisher now uses the unified single scheduler');
assert(!publisher.includes("- cron: '50 1-23/2 * * *'"),
 'Publisher must retain immutable per-hour scheduled event identity');
assert(publisher.includes('scheduled-event-slot.cjs --kind=publication'),
 'Delayed publisher event must use nominal GitHub event time, not runner wall clock');
assert(publisher.includes("if: steps.cadence.outputs.run == 'true'"),
 'Real publication remains gated by immutable schedule and owner policy');
assert.doesNotMatch(radar,/^  schedule:/m,'radar now uses the unified single scheduler');
assert(radar.includes('scheduled-event-slot.cjs --kind=market'),'Independent market radar uses original event time');
assert(gsc.includes('gsc-scheduled-slot.cjs')&&gsc.includes('github.event.schedule'),'GSC uses immutable cron trigger');
assert(geo.includes('scheduled-event-slot.cjs --kind=geo'),'GEO uses original event time');
assert(api.includes("github('/actions/workflows/' + unifiedWorkflow)"),'Unified GitHub workflow status must be read');
assert(api.includes("state === 'unknown' ? null : state === 'active'"),'Unknown not displayed as active');
const master=read('.github/workflows/v3-production-orchestrator.yml');
const cron=master.match(/- cron: '([^']+)'/)?.[1];
assert.equal(cron,undefined,'Master schedule must be suspended during isolated Radar validation');
// Dashboard still displays the previously configured cadence; API state reads are
// tested separately and are not evidence that an active cron is currently present.
assert(api.includes("state === 'unknown' ? null : state === 'active'"));
assert(ui.includes('جدولة الإنتاج الموحدة مفعّلة')&&ui.includes('تعذّر تأكيد تفعيل جدولة الإنتاج الموحدة'),'Visible accurate unified schedule state');
assert(ui.includes('العمليات الإنتاجية الحقيقية'),'High-frequency orchestrator must disclose due-gated real production');
console.log('PASS GEO Saudi burst cadence and workflow state, LLM indexing separate, publication policy intact');
