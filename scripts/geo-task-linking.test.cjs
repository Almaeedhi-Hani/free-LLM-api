'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {prClosesIssue}=require('../.impact-test-build/lib/geo-task-linking.js');
for(const phrase of ['Fixes #114.','Closes #114','Resolves #114','fixed #114','fix #114']){
 assert(prClosesIssue('### Change\n'+phrase,114),'Should accept explicit closure: '+phrase);
}
for(const phrase of [
 'Implements planned PR #114 workstream','PR #114 does not exist',
 'References #114','Fixes #1140','Fixes #1114','Closes #113',
 'Fixed route links without an issue'
])assert(!prClosesIssue(phrase,114),'Do not misattribute: '+phrase);
assert(!prClosesIssue(null,114));
assert(!prClosesIssue('Fixes #114',-1));
const route=fs.readFileSync('src/app/api/admin/technical-tasks/route.ts','utf8');
assert(route.includes('prClosesIssue(x.body,number)'),'Timeline cross-ref must also explicitly close the tracked issue');
console.log('PASS GEO issue identity: PR #118 references old workstream but only PR #119 explicitly closes issue #114');
