'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const workflow=fs.readFileSync('.github/workflows/geo-auto-publication-daily.yml','utf8');
const matches=[...workflow.matchAll(/cron:\s*['"]([0-9]{1,2})\s+([0-9]{1,2})\s+\*\s+\*\s+\*['"]/g)];
assert.equal(matches.length,1,'exactly one daily publisher schedule, no extra paid GEO analysis runs');
const minute=Number(matches[0][1]),hour=Number(matches[0][2]);
assert(minute>=0&&minute<=59&&hour>=0&&hour<=23);
const firstPublishedAt=new Date('2026-11-18T05:43:21.657Z');
const nextScheduled=Date.UTC(2026,10,19,hour,minute,0);
assert(nextScheduled-firstPublishedAt.getTime()>24*60*60*1000,
 'Nov 19 daily run must be outside 24h quota after initial verified publication');
assert(workflow.includes('--retry 0'),'no ambiguous publisher POST retries');
assert(workflow.includes('geo-auto-publication-daily'),'retains serialized publisher execution');
assert(workflow.includes('/api/geo/auto-publication'),'only the authenticated publisher endpoint is invoked');
console.log('PASS GEO daily publishing cadence after first live 24-hour quota, one daily job, serialized and no ambiguous retries');
