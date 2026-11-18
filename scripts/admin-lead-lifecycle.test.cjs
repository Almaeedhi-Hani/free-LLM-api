'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const migration=fs.readFileSync('supabase/migrations/20261118_package_request_safe_delete.sql','utf8');
for(const required of [
 'ADD COLUMN IF NOT EXISTS event_id uuid NOT NULL DEFAULT gen_random_uuid()',
 'PRIMARY KEY (event_id)',
 'UNIQUE (request_id)',
 'ALTER COLUMN request_id DROP NOT NULL',
 'ON DELETE SET NULL',
 'impact_lead_events_request_id_fkey'
]) assert(migration.includes(required),'Required privacy-preserving migration absent: '+required);
assert(!/DELETE\s+FROM\s+public\.impact_lead_events/i.test(migration),
 'Never delete historical confirmed leads to make personal-data deletion possible');
const admin=fs.readFileSync('src/app/api/admin/package-requests/route.ts','utf8');
assert(admin.includes('action === "update_status"'));
assert(admin.includes('"saved", "contacted", "closed"'));
assert(admin.includes('body: JSON.stringify({status:data.status})'));
assert(admin.includes('method: "DELETE"'),'Personal request deletion remains available');
assert(admin.includes('if (!authorized(req))'),'All mutations remain authenticated');
const ui=fs.readFileSync('src/components/PackageRequestsAdmin.tsx','utf8');
for(const value of ['حالة متابعة العميل','value="contacted"','value="closed"','action:"update_status"','حدث تحويل مجهول الهوية'])
 assert(ui.includes(value),'Missing real lead lifecycle or privacy disclosure: '+value);
console.log('PASS admin customer lifecycle and anonymized-delete with preserved conversion history');
