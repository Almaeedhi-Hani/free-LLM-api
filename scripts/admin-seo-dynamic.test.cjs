'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const api=fs.readFileSync('src/app/api/admin/visibility/route.ts','utf8');
assert(api.includes("import sitemap from '@/app/sitemap'"),
 'SEO inspection must use published dynamic sitemap rather than an obsolete fixed 21-route list');
assert(api.includes('const entries=await sitemap()'));
assert(api.includes("if(entries.length>100)throw Error"),'Bounded dynamic audit budget');
assert(api.includes("address.origin!==origin"),'No external URL fetches permitted');
assert(api.includes('duplicate_sitemap_target'), 'Never silently omit duplicated indexed URL');
assert(api.includes('expectedLanguages:Object.keys(entry.alternates?.languages||{})'),
 'Validate only declared localized counterparts, not nonexistent guide translations');
assert(api.includes("listed.map(inspect)"),'All published sitemap pages inspected');
assert(!api.includes("const paths = ['/',...SLUGS"),'Obsolete fixed 21-route list removed');
assert(!api.includes('لم يتم تفعيل تسجيل أحداث التحويل بعد.'),'Old false disconnected-state message removed');
assert(api.includes("migrated_to_impact_center"),'Legacy clients directed to actual measured endpoints');
assert(api.includes("if(!auth(req))"),'Read-only public URL audit remains admin only');
console.log('PASS admin SEO uses bounded, same-origin, dynamic published sitemap and current real metrics');
