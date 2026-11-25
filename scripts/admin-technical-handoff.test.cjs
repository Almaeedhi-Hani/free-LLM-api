'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const migration=fs.readFileSync('supabase/migrations/20261118_geo_technical_task_handoffs.sql','utf8');
for(const term of [
 'CREATE TABLE IF NOT EXISTS public.geo_technical_task_handoffs',
 'item_id text PRIMARY KEY',
 "kind IN ('technical_seo','internal_link')",
 'github_issue_number integer UNIQUE',
 'ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON public.geo_technical_task_handoffs FROM PUBLIC,anon,authenticated',
 'GRANT SELECT,INSERT,UPDATE ON public.geo_technical_task_handoffs TO service_role'
])assert(migration.includes(term),'Missing secure task lifecycle invariant: '+term);
const route=fs.readFileSync('src/app/api/admin/technical-tasks/route.ts','utf8');
for(const invariant of [
 'if(!authorized(req))',
 "data.confirm!=='CREATE_GEO_TECHNICAL_ISSUE'",
 "['technical_seo','internal_link'].includes(item.kind)",
 "item.status!=='pending'",
 "const token=(process.env.GEO_GITHUB_TOKEN||'').trim()",
 "'https://api.github.com/repos/'+repo+'/issues'",
 "method:'POST'",
 "status:'queued'",
 "reserved.status===409",
 "status:'issue_open'",
 "github_issue_not_confirmed_no_retry",
 "github_issue_created_but_audit_link_unconfirmed"
])assert(route.includes(invariant),'Missing gated or auditable GitHub handoff: '+invariant);
assert(!route.includes('process.env.GITHUB_TOKEN||'), 'Avoid alternate unscoped token fallback');
assert(!route.includes('merge_pull_request'), 'Never auto-merge code for generated technical suggestion');
const board=fs.readFileSync('src/components/TechnicalTaskBoard.tsx','utf8');
assert(board.includes('إنشاء تذكرة تنفيذ')&&board.includes('بانتظار التنفيذ'));
assert(board.includes("confirm:'CREATE_GEO_TECHNICAL_ISSUE'"));
assert(board.includes('window.confirm('),'Explicit operator choice before GitHub write');
assert(board.includes('لن يُعدّ الكود منفذًا'),'UI must not confuse issue creation with deployment');
const admin=require('./support/admin-dashboard-source.cjs').readAdminDashboardSource();
assert(admin.includes('<TechnicalTaskBoard secret={secret} items={content.editorialItems||[]} onOpenDetails={()=>setTab(\'editorial\')} />'));
assert(fs.existsSync('scripts/admin-seven-hubs-browser-e2e.cjs'));
const browser=fs.readFileSync('scripts/admin-seven-hubs-browser-e2e.cjs','utf8');
assert(browser.includes("assert.equal(seen.size,18")&&browser.includes("assert.equal(await groups.count(),7"));
console.log('PASS controlled technical-SEO issue handoffs, service-only audit RLS and seven-hub real-browser coverage');
