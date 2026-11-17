'use strict';
const assert=require('node:assert/strict');
const {compareConsecutiveGscDays:compare}=require('../.visibility-test-build/gsc-daily-comparison.js');
const row=(date,impressions,clicks=0,position=5)=>({metric_date:date,impressions,clicks,position});
const consecutive=compare([row('2026-11-16',60,6),row('2026-11-15',100,10)]);
assert.equal(consecutive.comparison,'consecutive_days');
assert.equal(consecutive.change.impressions,-40);
assert.equal(consecutive.alerts[0].type,'impressions_drop');
for(const sample of [
 [row('2026-11-16',60),row('2026-11-14',100)],
 [row('2026-11-16',60),row('2026-11-16',100)],
 [row('2026-02-30',60),row('2026-02-28',100)],
]){const result=compare(sample);assert.equal(result.change,null);assert.equal(result.alerts.length,0);}
assert.equal(compare([row('2026-11-16',0)]).comparison,'insufficient_data');
assert.equal(compare([row('2026-11-16',9),row('2026-11-15',10)]).alerts.length,0);
assert.equal(compare([row('2026-11-16',1,2),row('2026-11-15',10)]).comparison,'invalid_metrics');
assert.equal(compare([row('2026-11-16',60,1,null),row('2026-11-15',100,1,5)]).change.position,null);
assert.equal(compare([row('2026-03-01',70),row('2026-02-28',100)]).comparison,'consecutive_days');
console.log('PASS GSC consecutive daily comparison and gap safeguards');
