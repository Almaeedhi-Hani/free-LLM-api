'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {dailyKey,health,alerts,healthText}=require('../src/lib/telegram-ops-phase2.cjs');
const now='2026-11-25T06:00:00Z';
test('daily uses Riyadh 09:00 slot, no duplicate per day',()=>{
 assert.equal(dailyKey(now),'daily:2026-11-25');
 assert.equal(dailyKey('2026-11-25T08:59:00Z'),'daily:2026-11-25');
 assert.equal(dailyKey('2026-11-25T09:00:00Z'),null);
 assert.equal(dailyKey('2026-11-24T21:00:00Z'),null);
});
test('distinguishes stale, failed, unknown and recent results',()=>{
 const d={now,radar:{status:'success',finished_at:'2026-11-25T05:00:00Z'},geo:{status:'error',lastRun:'2026-11-25T03:00:00Z'},gsc:{status:'success_with_data',checked_at:'2026-11-24T20:00:00Z'},watchdog:null,watchdogIssues:null};
 assert.deepEqual(health(d).map(x=>x.state),['recent','failed','stale','unknown']);
 assert.equal(alerts(d).length,2);
 assert(healthText(d).includes('غير متاح'));
 assert.deepEqual(alerts(d),alerts({...d,now:'2026-11-25T06:15:00Z'}));
 assert.equal(alerts({...d,geo:{status:'success',lastRun:now},gsc:{status:'success_no_data',checked_at:now}}).length,0);
});
test('watchdog issue links are scoped, deterministic and numeric',()=>{
 const d={now,watchdogIssues:[{number:42,created_at:now},{number:'https://bad.example',created_at:now}]};
 const a=alerts(d);assert.equal(a.length,1);assert(a[0].text.includes('/issues/42'));assert(!a[0].text.includes('bad.example'));
});
test('invalid or future timestamps do not invent health',()=>{
 const d={now,geo:{status:'success',lastRun:'2030-01-01T00:00:00Z'},radar:{status:'success',finished_at:'invalid'}};
 assert(health(d).every(x=>x.state==='unknown'));assert.equal(alerts(d).length,0);
});
