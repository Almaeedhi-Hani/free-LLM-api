'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { assess } = require('./llm-pr-ci-gate.cjs');
const ok = name => ({name,status:'completed',conclusion:'success'});
const waiting = name => ({name,status:'in_progress',conclusion:null});
const required = [ok('Build and regression tests'),ok('postgres-security'),ok('verify'),ok('verify')];
assert.equal(assess({check_runs:[]}).state, 'pending', 'no check runs must never authorize merge');
assert.equal(assess({check_runs:required.slice(0,3)}).state, 'pending', 'both independent verify checks required');
assert.equal(assess({check_runs:[...required.slice(0,3),waiting('verify')]}).state,'pending');
assert.equal(assess({check_runs:required}).state, 'passed');
assert.equal(assess({check_runs:[...required,ok('optional')]}).state,'passed');
assert.equal(assess({check_runs:[...required,waiting('optional')]}).state,'pending');
assert.equal(assess({check_runs:[...required,{name:'optional',status:'completed',conclusion:'failure'}]}).state,'blocked');
assert.equal(assess({check_runs:[...required.slice(0,1),{name:'postgres-security',status:'completed',conclusion:'failure'},...required.slice(2)]}).state,'blocked');
assert.equal(assess({check_runs:[...required,{name:'browser',status:'completed',conclusion:'skipped'}]}).state,'blocked');
assert.equal(assess({}).state,'blocked');
const cli=path.join(__dirname,'llm-pr-ci-gate.cjs');
for(const [data, expected] of [[{check_runs:[]},2],[{check_runs:required},0],[{check_runs:[...required,{name:'other',status:'completed',conclusion:'failure'}]},1]]) {
 const run=spawnSync(process.execPath,[cli],{input:JSON.stringify(data),encoding:'utf8'});
 assert.equal(run.status,expected,run.stderr+run.stdout);
}
console.log('PASS W05 automated index PR CI gate: missing checks, duplicate verify, pending, failure, success');
