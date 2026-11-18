'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const migration=fs.readFileSync('supabase/migrations/20261118_fix_geo_publisher_postgrest_role.sql','utf8');
const earlier=fs.readFileSync('supabase/migrations/20261118_geo_source_optional_unattended_publish.sql','utf8');
assert(migration.includes("'current_setting(''request.jwt.claim.role'',true)'"),'migration must match deprecated GUC exactly');
assert(migration.includes("'current_setting(''role'',true)'"),'use authenticated PostgREST SET ROLE, not SECURITY DEFINER current_user');
assert(migration.includes('changed<>4'), 'all four writer/rollback functions must be migrated');
assert(migration.includes("Unexpected function security flags"),'retain SECURITY DEFINER and locked search_path');
assert(!/GRANT\s+EXECUTE\s+ON\s+FUNCTION[^;]*\bTO\s+(PUBLIC|anon|authenticated)\b/i.test(migration),'never widen execution privileges');
for(const name of ['geo_commit_auto_publication','geo_rollback_auto_publication','geo_commit_auto_faq','geo_rollback_auto_faq']){
 assert(earlier.includes('public.'+name),'expected original publisher function '+name);
}
assert(earlier.includes('SET search_path ='), 'legacy functions have pinned search_path');
console.log('PASS PostgREST v14 publication auth migration: verified database role, 4 service-only functions, no widened RPC grants');
