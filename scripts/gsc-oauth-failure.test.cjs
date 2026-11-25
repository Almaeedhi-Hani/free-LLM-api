'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {classifyGscSyncFailure}=require('../.visibility-test-build/gsc-oauth-failure.js');
for(const status of [400,401]){
 const result=classifyGscSyncFailure(new Error('google_token_'+status));
 assert.deepEqual(result,{error:'google_token_'+status,retryable:false,
   operator_action:'reauthorize_google_oauth'});
}
assert.deepEqual(classifyGscSyncFailure(new Error('google_token_missing')),
 {error:'google_token_missing',retryable:false,operator_action:'reauthorize_google_oauth'});
assert.deepEqual(classifyGscSyncFailure(new Error('google_search_429')),
 {error:'google_search_429',retryable:false});
assert.deepEqual(classifyGscSyncFailure(new Error('supabase_write_502')),
 {error:'supabase_write_502',retryable:false});
const sensitive='client_secret=secret-value&refresh_token=refresh-value';
const bad=classifyGscSyncFailure(new Error(sensitive));
assert.deepEqual(bad,{error:'gsc_unexpected_failure',retryable:false});
assert(!JSON.stringify(bad).includes('secret-value'));
const route=fs.readFileSync('src/lib/gsc/sync-service.ts','utf8');
assert(route.includes('classifyGscSyncFailure(error)'));
assert(route.includes('return NextResponse.json({status:\'error\',...failure},{status:502})'));
assert(route.includes("throw new Error('google_token_' + tokenResponse.status)"));
console.log('PASS GSC owner-action OAuth diagnostic, secret-safe errors, existing HTTP retry policy unchanged');
