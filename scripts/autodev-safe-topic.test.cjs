'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {findTask,validate}=require('./autodev-safe-topic.cjs');
const baseline=JSON.parse(fs.readFileSync('src/data/content-tree.json','utf8'));
const task=findTask(baseline);
assert.equal(validate(baseline,baseline),0,'no changes must be valid for no-work runs');
if(task){
 const modified=JSON.parse(JSON.stringify(baseline));
 modified.nodes.find(x=>x.id===task.destination).related_nodes.push(task.source);
 assert.equal(validate(baseline,modified),1);
 const bad=JSON.parse(JSON.stringify(modified));
 bad.nodes.find(x=>x.id===task.destination).route='https://evil.example/';
 assert.throws(()=>validate(baseline,bad),/cannot change content/);
 const bad2=JSON.parse(JSON.stringify(modified));
 bad2.nodes.find(x=>x.id===task.destination).related_nodes.push('fake-route');
 assert.throws(()=>validate(baseline,bad2),/only one new edge|six-link maximum/);
 const bad3=JSON.parse(JSON.stringify(modified));
 bad3.nodes.find(x=>x.id===task.destination).related_nodes=[];
 assert.throws(()=>validate(baseline,bad3),/no removed related links/);
}
console.log('PASS bounded auto-dev: live paths only, max one tested reciprocal link, no other changes');
