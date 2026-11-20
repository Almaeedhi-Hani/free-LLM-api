'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dashboard=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
const component=fs.readFileSync('src/components/LegacyToolsArchive.tsx','utf8');
const flags=fs.readFileSync('src/lib/admin-consolidation-flags.ts','utf8');
const archive=fs.readFileSync('docs/plans/phase4-legacy-inventory-20261120.md','utf8');
assert(flags.includes("NEXT_PUBLIC_ADMIN_LEGACY_ARCHIVE !== 'false'"),'Explicit reversible UI flag');
assert(dashboard.includes('!ADMIN_LEGACY_ARCHIVE_ENABLED && <details'),'Legacy actions remain recoverable');
assert(dashboard.includes('<LegacyToolsArchive onNavigate={setTab} />'),'Archive should use authenticated parent navigation');
assert(dashboard.includes("tab === 'settings'"),'Archive must live only behind admin login');
assert(component.includes('<details id="admin-legacy-archive"'),'Closed-by-default semantic disclosure');
assert(!component.includes('<details id="admin-legacy-archive" open'),'Archive must start folded');
for(const id of ['B15','V04-partial','B08-D08','V07-manual','cron-legacy','V18-shortcuts']) {
 assert(component.includes("id:'"+id+"'"),'Legacy tool missing: '+id);
}
assert(!dashboard.includes("key: 'archive'"),'Archive must not duplicate the main navigation');
assert(component.includes('غير معروف')&&archive.includes('Unknown'),'Do not invent last-use evidence');
assert(!component.includes("fetch(")&&!component.includes("POST"),'Archived diagnostics must not run workflows');
console.log('PASS Phase 4 legacy inventory: reversible, admin-only, one closed archive, no old API invocation');
