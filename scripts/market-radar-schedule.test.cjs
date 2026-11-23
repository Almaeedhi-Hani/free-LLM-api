'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {shouldRun,SWITCH_UTC}=require('./scheduled-cadence-gate.cjs');

const workflow=fs.readFileSync('.github/workflows/market-radar.yml','utf8');
const endpoint=fs.readFileSync('src/app/api/cron-market/route.ts','utf8');
const budget=fs.readFileSync('scripts/radar-discovery-budget.test.cjs','utf8');

assert.doesNotMatch(workflow,/^  schedule:/m,'independent radar cron removed in favor of unified scheduler');
assert(workflow.includes("scheduled-event-slot.cjs --kind=market"),
 'standalone radar must preserve nominal event slot, not runner wall clock');
assert(workflow.includes("steps.cadence.outputs.run == 'true'"),
 'provider request must be skipped on disabled four-hour half slots');
assert.equal(SWITCH_UTC,'2026-11-21T21:00:00.000Z',
 'exact transition from 2h to 4h at Sunday 00:00 Saudi');
const date=s=>new Date(s);
assert(shouldRun({now:date('2026-11-21T20:55:00Z'),slot:'odd'}),
 'Saudi Saturday 23:55 should still run in 2h burst');
assert(shouldRun({now:date('2026-11-21T22:55:00Z'),slot:'odd'}),
 'Saudi Sunday 01:55 is the first 4h radar run');
assert(!shouldRun({now:date('2026-11-22T00:55:00Z'),slot:'odd'}),
 'Saudi Sunday 03:55 is an intentional no-op');
assert(shouldRun({now:date('2026-11-22T02:55:00Z'),slot:'odd'}),
 'Saudi Sunday 05:55 is an active 4h radar run');

assert(workflow.includes('group: market-intelligence-radar')&&
 workflow.includes('cancel-in-progress: false'),'do not overlap radar tasks');
assert(workflow.includes('timeout-minutes: 10'),'do not increase existing 10-minute job timeout');
assert(workflow.includes('MARKET_RADAR_PAUSED'),'allow explicit pause via GitHub variable');
assert(workflow.includes('secrets.CRON_SECRET'),'server call must remain authenticated');
assert(/if \[ -z .+CRON_SECRET/.test(workflow),'no request without a secret');
assert(workflow.includes('curl --fail-with-body --retry 0 --connect-timeout 15 --max-time 480'),
 'never retry a data-changing radar request');
assert(workflow.includes('/api/cron-market'),'existing bounded radar route must be reused');
assert(!workflow.includes('--full-pipeline'),'this workflow must not run GEO again');
assert(workflow.includes("paths:\n      - '.github/workflows/market-radar.yml'"),
 'first-rollout push must not fire radar on every code change');

assert(endpoint.includes("req.headers.get('authorization')")&&
 endpoint.includes('CRON_SECRET'),'radar endpoint authenticates calls');
assert(endpoint.includes("runRadar({ triggeredBy: 'cron' })"),
 'existing market intelligence pipeline must be preserved');
assert(budget.includes('search_requests_limit')&&budget.includes('suggestion_requests_limit'),
 'bounded query/provider budget must remain tested');
console.log('PASS independent radar 2h-to-4h Saudi scheduling, no overlap, existing auth and provider limits');
