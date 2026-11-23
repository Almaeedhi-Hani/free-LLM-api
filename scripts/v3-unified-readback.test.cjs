'use strict';
const assert=require('node:assert/strict');
const {verify,HOST,TARGETS}=require('./v3-unified-readback.cjs');
(async()=>{
 assert.deepEqual(TARGETS,['W01','W02','W03','W04']);
 assert.equal(HOST,'https://free-llm-api-1-didl.onrender.com');
 for(const target of TARGETS){
  let called=0;
  const got=await verify(target,{key:'mock-fixture',fetchImpl:async(url,options)=>{
   called++;
   assert.equal(url,HOST+'/api/geo/monitor-readback?scope=weekly');
   assert.equal(options.method,'GET');
   assert.equal(options.redirect,'error');
   assert.equal(options.headers['x-geo-api-key'],'mock-fixture');
   return {status:200,json:async()=>({
    source:'supabase',scope:'weekly',storage:Object.fromEntries(TARGETS.map(x=>[x,{
     status:'observed',latestTimestamp:'2026-11-23T01:20:00.000Z'
    }]))})};
  }});
  assert.equal(called,1);
  assert.equal(got.system,target);
  assert.equal(got.storage,'observed');
 }
 await assert.rejects(()=>verify('other',{key:'mock'}),/Invalid system/);
 await assert.rejects(()=>verify('W01',{key:''}),/credential unavailable/);
 await assert.rejects(()=>verify('W01',{key:'mock',fetchImpl:async()=>({status:401})}),/HTTP failure/);
 await assert.rejects(()=>verify('W01',{key:'mock',fetchImpl:async()=>({
  status:200,json:async()=>({source:'fixture',scope:'weekly'})
 })}),/Untrusted/);
 await assert.rejects(()=>verify('W01',{key:'mock',fetchImpl:async()=>({
  status:200,json:async()=>({source:'supabase',scope:'weekly',storage:{W01:{status:'unknown'}}})
 })}),/not independently observed/);
 console.log('PASS unified protected W01-W04 readbacks, strict host, no writes, invalid/partial evidence fails closed');
})().catch(e=>{console.error(e);process.exitCode=1});
