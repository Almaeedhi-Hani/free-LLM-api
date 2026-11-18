'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261118_geo_postgrest_jwt_claim_compat.sql','utf8');
for(const name of ['geo_commit_auto_publication','geo_commit_auto_faq','geo_rollback_auto_faq','geo_rollback_auto_publication']){
 assert(sql.includes('FUNCTION public.'+name+'('),'missing updated RPC: '+name);
}
assert.equal((sql.match(/request\.jwt\.claims/g)||[]).length,5,'Four PostgREST JSON role checks plus one comment');
assert.equal((sql.match(/IS DISTINCT FROM 'service_role' THEN/gi)||[]).length,4,'Every mutating RPC must fail closed without service_role JWT');
assert(!/if\s+current_setting\('request\.jwt\.claim\.role',true\)\s+is\s+distinct/i.test(sql),'No JWT-legacy-only gate');
assert(sql.includes("NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'role'"),'PostgREST current JWT role must be read from claims JSON');
for(const signature of ['geo_commit_auto_publication(text,jsonb,jsonb)','geo_commit_auto_faq(text)','geo_rollback_auto_faq(uuid)','geo_rollback_auto_publication(uuid)']){
 assert(sql.includes('GRANT EXECUTE ON FUNCTION public.'+signature+' TO service_role'),
 'Only service_role may execute RPC: '+signature);
}
assert(sql.includes("jsonb_array_length(p_verified_urls)>12"),'Sources remain optional');
assert(!sql.includes("independent_official_sources_required"),'No two-government-source barrier');
assert(sql.includes("v_n >= v_limit"),'Combined daily quota still enforced');
assert(sql.includes("IS DISTINCT FROM v_event.after_item"),'Precise rollback snapshot conflict check maintained');
console.log('PASS: all four GEO publication RPCs accept modern PostgREST JWT role claims, require service_role, preserve optional citations and exact-version rollback');
