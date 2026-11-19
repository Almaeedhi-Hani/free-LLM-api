'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createGscAtomicStore}=require('../.visibility-test-build/gsc-atomic-storage.js');
const mkReply=(body,status=200)=>({ok:status>=200&&status<300,status,
 json:async()=>body});
(async()=>{
 const requests=[];
 const state={property:'https://example.test/',metric_date:'2026-11-16',
   status:'success_with_data',checked_at:'2026-11-19T06:30:00.000Z',
   rows_fetched:1,attempts:1};
 const row={dimension:'total',dimension_value:'',clicks:0,impressions:0,ctr:0,position:0};
 const write={property:state.property,outcome:state,measurements:[row]};
 const request=async(url,opt)=>{
   requests.push({url,opt});
   assert.equal(opt.headers.apikey,'service-only-fixture');
   assert.equal(opt.headers.Authorization,'Bearer service-only-fixture');
   assert.equal(opt.cache,'no-store');
   if(opt.method==='GET')return mkReply([state]);
   const body=JSON.parse(opt.body);
   if(url.endsWith('/gsc_sync_commit_day_v2')){
      assert.equal(body.p_date,'2026-11-16');
      assert.deepEqual(body.p_rows,[row]);
      return mkReply({status:'success_with_data',stored:1,attempts:1});
   }
   if(url.endsWith('/gsc_sync_verify_day_v2')){
      assert.deepEqual(body.p_expected_rows,[row]);
      return mkReply({outcome:state,matchingMeasurements:1});
   }
   throw Error('unexpected_url');
 };
 const store=createGscAtomicStore({url:'https://example.supabase.co',key:'service-only-fixture',request});
 assert.deepEqual(await store.getHistory(state.property),[state]);
 await store.commitDay(write);
 assert.deepEqual(await store.readDay(write),{outcome:state,matchingMeasurements:1});
 assert.equal(requests.length,3);
 const failing=createGscAtomicStore({url:'https://example.supabase.co',key:'service-only-fixture',
   request:async()=>mkReply({message:'storage unavailable'},503)});
 await assert.rejects(()=>failing.getHistory(state.property),/gsc_atomic_read_503/);
 await assert.rejects(()=>failing.commitDay(write),/gsc_atomic_rpc_gsc_sync_commit_day_v2_503/);
 await assert.rejects(()=>failing.readDay(write),/gsc_atomic_rpc_gsc_sync_verify_day_v2_503/);
 assert.throws(()=>createGscAtomicStore({url:'http://unsafe.example',key:'key'}),/gsc_atomic_storage/);
 const badCommit=createGscAtomicStore({url:'https://example.supabase.co',key:'test',
   request:async()=>mkReply({status:'failed',stored:0,attempts:2})});
 await assert.rejects(()=>badCommit.commitDay(write),/ack_mismatch/);
 const sql=fs.readFileSync('supabase/migrations/20261119_v3_gsc_atomic_day_outcomes.sql','utf8');
 for(const invariant of [
   'gsc_sync_day_outcomes','ENABLE ROW LEVEL SECURITY',
   "'page_query'",
   'REVOKE ALL ON TABLE public.gsc_sync_day_outcomes FROM PUBLIC, anon, authenticated',
   'SECURITY INVOKER SET search_path',
   'pg_advisory_xact_lock','Stale GSC attempt',
   'GSC service role required','gsc_sync_commit_day','gsc_sync_verify_day',
   'GRANT EXECUTE ON FUNCTION public.gsc_sync_commit_day',
   'ON CONFLICT(property,metric_date,dimension,dimension_value)',
 ])assert(sql.includes(invariant),'Missing GSC atomic invariant: '+invariant);
 assert(!/\bDROP\s+TABLE\b/i.test(sql),'no destructive production table change');
 const v2=fs.readFileSync('docs/plans/gsc-role-rpc-v2-owner-approval.sql','utf8');
 for(const invariant of [
  'CREATE FUNCTION public.gsc_sync_commit_day_v2',
  'CREATE FUNCTION public.gsc_sync_verify_day_v2',
  "current_user IS DISTINCT FROM 'service_role'",
  'SECURITY INVOKER SET search_path',
  'GRANT EXECUTE ON FUNCTION public.gsc_sync_commit_day_v2',
  'GRANT EXECUTE ON FUNCTION public.gsc_sync_verify_day_v2',
  'REVOKE ALL ON FUNCTION public.gsc_sync_commit_day_v2',
  'REVOKE ALL ON FUNCTION public.gsc_sync_verify_day_v2',
  'pg_advisory_xact_lock',
  'Stale GSC attempt',
  'ON CONFLICT(property,metric_date,dimension,dimension_value)'
 ])assert(v2.includes(invariant),'Missing additive v2 RPC invariant: '+invariant);
 assert.equal((v2.match(/current_user IS DISTINCT FROM 'service_role'/g)||[]).length,2,
   'both v2 functions must enforce actual service_role');
 assert(!v2.includes('CREATE OR REPLACE FUNCTION'),'no destructive replacement of V1 functions');
 assert(!/\b(?:DROP|DELETE|TRUNCATE|ALTER\s+TABLE)\b/i.test(v2.replace(/^--.*$/gm,'')),
   'add-only migration may not remove or alter existing tables');
 assert(v2.includes('DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT SCHEMA MIGRATION APPROVAL'));
 const active=fs.readFileSync('supabase/migrations/20261119_phase1_gsc_service_role_rpc_v2.sql','utf8');
 const approved=v2.slice(v2.indexOf('CREATE FUNCTION public.gsc_sync_commit_day_v2('),v2.indexOf('\nCOMMIT;')).trim();
 const activeBody=active.slice(active.indexOf('CREATE FUNCTION public.gsc_sync_commit_day_v2(')).trim();
 assert.equal(activeBody,approved,
   'managed production migration must exactly match reviewed additive SQL proposal (excluding transaction wrapper)');
 assert(!/\\bDROP\\s+TABLE\\b|\\bDELETE\\s+FROM\\b|\\bALTER\\s+TABLE\\b|CREATE\\s+OR\\s+REPLACE\\s+FUNCTION/i.test(active.replace(/^--.*$/gm,'')),
   'managed GSC migration must be strictly additive and not replace original v1 functions');


 const route=fs.readFileSync('src/app/api/cron-gsc/route.ts','utf8');
 assert(route.includes("process.env.GSC_BACKFILL_ENABLED==='true'"));
 assert(route.includes('executeGscCatchup('));
 assert(route.includes('createGscAtomicStore('));
 assert(route.includes('getRowsForDate('));
 assert(route.includes("gsc_daily_metrics?on_conflict="),'legacy path unchanged');
 console.log('PASS GSC atomic RPC: service-only, no retry, commit+readback, legacy fallback, SQL guards');
})().catch(e=>{console.error(e);process.exitCode=1});
