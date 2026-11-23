'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {shouldRun,SWITCH_UTC}=require('./scheduled-cadence-gate.cjs');
const {eventSlot}=require('./scheduled-event-slot.cjs');

const workflow=fs.readFileSync('.github/workflows/market-radar.yml','utf8');
const endpoint=fs.readFileSync('src/app/api/cron-market/route.ts','utf8');
const budget=fs.readFileSync('scripts/radar-discovery-budget.test.cjs','utf8');

const historicalRadarCrons=Array.from({length:12},(_,i)=>i===9?'9 17 23 11 *':'55 '+(i*2)+' * * *');
assert.deepEqual([...workflow.matchAll(/- cron: '([^']+)'/g)].map(m=>m[1]),historicalRadarCrons,
 'W02 replaces the 21:55 KSA slot with a one-time 20:09 KSA schedule');
assert.equal(eventSlot('market','55 22 * * *','2026-11-20T01:21:00.000Z').allowed,true,
 'A several-hour delayed GitHub schedule remains eligible');
assert.equal(eventSlot('market','55 20 * * *','2026-11-23T00:21:00.000Z').allowed,false,
 'Four-hour production cadence still skips the unused half slot');
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
assert.doesNotMatch(workflow,/^  push:/m,'independent workflow push trigger must remain removed');

assert(endpoint.includes("req.headers.get('authorization')")&&
 endpoint.includes('CRON_SECRET'),'radar endpoint authenticates calls');
assert(endpoint.includes("runRadar({ triggeredBy: 'cron' })"),
 'existing market intelligence pipeline must be preserved');
assert(endpoint.includes('W02_SUPABASE_HMAC_SECRET') &&
 endpoint.includes('x-w02-cron-ts') && endpoint.includes('x-w02-cron-signature') &&
 endpoint.includes("createHmac('sha256'") && endpoint.includes('timingSafeEqual'),
 'Supabase cron must authenticate without disclosing Vault key in HTTP headers');
assert(endpoint.includes('Math.abs(Math.floor(Date.now() / 1000) - epochSeconds) > 300') &&
 endpoint.includes('originalGitHubAuth') &&
 endpoint.includes('signedSupabaseAuth'),
 'Five-minute replay window and original GitHub bearer rollback path must be retained');
assert(budget.includes('search_requests_limit')&&budget.includes('suggestion_requests_limit'),
 'bounded query/provider budget must remain tested');
console.log('PASS independent radar 2h-to-4h Saudi scheduling, no overlap, existing auth and provider limits');
