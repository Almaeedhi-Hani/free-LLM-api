#!/usr/bin/env node
'use strict';
/** Release 1 autonomous work: at most one reciprocal link between LIVE service routes.
 * All other content is immutable; no agent/model can write executable code. */
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const path='src/data/content-tree.json';
function findTask(data){
 const byId=new Map(data.nodes.map(x=>[x.id,x]));
 const live=n=>typeof n.route==='string'&&n.route.startsWith('/services/');
 for(const from of data.nodes.filter(live)){
  for(const id of from.related_nodes){
   const target=byId.get(id);
   if(!target||!live(target)||target.id===from.id)continue;
   if(target.related_nodes.includes(from.id)||target.related_nodes.length>=6)continue;
   return {source:from.id,destination:target.id};
  }
 }
 return null;
}
function validate(before,after){
 assert.deepEqual(Object.keys(before),Object.keys(after),'manifest schema unchanged');
 assert.equal(before.nodes.length,after.nodes.length,'topic count unchanged');
 const oldMap=new Map(before.nodes.map(n=>[n.id,n]));
 const newMap=new Map(after.nodes.map(n=>[n.id,n]));
 assert.equal(oldMap.size,newMap.size,'no duplicated topic IDs');
 let changed=0;
 for(const prior of before.nodes){
  const current=newMap.get(prior.id);
  assert(current,'no deleted topics');
  assert.deepEqual({...current,related_nodes:prior.related_nodes},prior,
    'cannot change content, route, sources or schema');
  const newLinks=current.related_nodes.filter(x=>!prior.related_nodes.includes(x));
  const removed=prior.related_nodes.filter(x=>!current.related_nodes.includes(x));
  assert.equal(removed.length,0,'no removed related links');
  assert.equal(new Set(current.related_nodes).size,current.related_nodes.length,'no duplicates');
  assert(current.related_nodes.length<=6,'six-link maximum');
  if(newLinks.length){
   assert.equal(newLinks.length,1,'only one new edge');
   const source=newMap.get(newLinks[0]);
   assert(source?.route?.startsWith('/services/'),'source must be an existing live service');
   assert(current.route?.startsWith('/services/'),'destination must be existing live service');
   assert(source.related_nodes.includes(current.id),'add only reverse links for curated relationships');
   changed++;
  }
 }
 assert(changed<=1,'maximum one changed node');
 return changed;
}
function main(args){
 const data=JSON.parse(fs.readFileSync(path,'utf8'));
 if(args.includes('--verify')){
  const baseline=JSON.parse(execFileSync('git',['show','HEAD:'+path],{encoding:'utf8'}));
  assert.equal(validate(baseline,data),1,'expected exactly one safe change');
  console.log('SAFE_LINK_CHANGE_VERIFIED');
  return;
 }
 const task=findTask(data);
 if(!task){console.log('NO_SAFE_TASK_AVAILABLE');return;}
 if(args.includes('--apply')){
  const previous=JSON.parse(JSON.stringify(data));
  data.nodes.find(n=>n.id===task.destination).related_nodes.push(task.source);
  assert.equal(validate(previous,data),1);
  fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');
 }
 console.log(JSON.stringify({type:'live-service-reciprocity',...task,applied:args.includes('--apply')}));
}
if(require.main===module)main(process.argv.slice(2));
module.exports={findTask,validate};
