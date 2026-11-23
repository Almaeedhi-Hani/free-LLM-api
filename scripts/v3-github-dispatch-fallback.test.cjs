'use strict';
const assert=require('node:assert/strict');
const {run,shouldDispatch,ROOT,WORKFLOW}=require('./v3-github-dispatch-fallback.cjs');
(async()=>{
 const now=Date.parse('2026-11-23T06:00:00Z');
 const entry=(minutes,status='completed',event='schedule',branch='main')=>({
  id:1,event,head_branch:branch,status,
  created_at:new Date(now-minutes*60000).toISOString()
 });
 assert.deepEqual(shouldDispatch([],now),{dispatch:true,reason:'no_recent_master'});
 assert.equal(shouldDispatch([entry(2)],now).reason,'recent_master_run');
 assert.equal(shouldDispatch([entry(2,'completed','workflow_dispatch')],now).dispatch,false);
 assert.equal(shouldDispatch([entry(2,'completed','push')],now).dispatch,false);
 assert.equal(shouldDispatch([entry(8,'in_progress')],now).reason,'master_still_active');
 assert.equal(shouldDispatch([entry(6)],now).dispatch,true);
 assert.equal(shouldDispatch([entry(8,'completed','schedule','other')],now).dispatch,true);
 assert.throws(()=>shouldDispatch([{event:'malicious',status:'completed',created_at:new Date(now).toISOString(),head_branch:'main'}],now),/Untrusted/);
 assert.throws(()=>shouldDispatch([entry(-3)],now),/future/);
 let seen=[];
 const fake=async(url,opt)=>{
  seen.push({url,method:opt.method,headers:opt.headers,body:opt.body});
  assert(url.startsWith(ROOT+'/actions/workflows/'+WORKFLOW));
  if(opt.method==='GET')return {status:200,json:async()=>({workflow_runs:[]})};
  if(opt.method==='POST')return {status:204};
  throw Error('Unexpected method');
 };
 const env={V3_GITHUB_DISPATCH_TOKEN:'non-production-fixture-token-long-enough'};
 let messages=[];
 assert.deepEqual(await run({env,fetchFn:fake,now,log:x=>messages.push(x)}),
  {status:'dispatched',reason:'fallback_event'});
 assert.deepEqual(seen.map(x=>x.method),['GET','POST']);
 assert.deepEqual(JSON.parse(seen[1].body),{ref:'main'});
 assert.equal(seen[1].url,ROOT+'/actions/workflows/'+WORKFLOW+'/dispatches');
 assert(messages[0].includes('NOT event=schedule'));
 assert(!messages.join(' ').includes(env.V3_GITHUB_DISPATCH_TOKEN));
 seen=[];
 assert.deepEqual(await run({env:{...env,V3_MASTER_PAUSED:'true'},fetchFn:fake,now}),{
  status:'skipped',reason:'master_paused'
 });
 assert.equal(seen.length,0);
 seen=[];
 assert.equal((await run({env,now,fetchFn:async(url,opt)=>{
  seen.push(opt.method);
  return {status:200,json:async()=>({workflow_runs:[entry(1)]})};
 }})).status,'skipped');
 assert.deepEqual(seen,['GET']);
 await assert.rejects(()=>run({env:{},fetchFn:fake,now}),/credential missing/);
 await assert.rejects(()=>run({env,now,fetchFn:async()=>({status:403})}),/preflight failed HTTP 403/);
 console.log('PASS external fallback remains unprovisioned by default, validates API origin, no duplicate master within 4m, active-run guard, master pause, no token logging, POST only after valid GET');
})().catch(e=>{console.error(e);process.exitCode=1});
