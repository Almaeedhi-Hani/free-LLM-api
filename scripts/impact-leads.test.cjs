'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {canonicalImpactOrigin,summarizeConfirmedLeads}=require('../.impact-test-build/lib/impact-attribution.js');
assert.equal(canonicalImpactOrigin('/en/insights/saudi-investor-guide/'),'/en/insights/saudi-investor-guide');
assert.equal(canonicalImpactOrigin('/zh/services/company-formation'),'/zh/services/company-formation');
assert.equal(canonicalImpactOrigin('/packages'),'/packages');
for(const x of ['//evil.com','https://evil.test/','/insights/../admin','/admin','/en/insights/x?email=user@example.com','/en/insights/x#marker','/en/insights/../../etc',null])assert.equal(canonicalImpactOrigin(x),null);
const rows=[
 {source_path:'/en/insights/saudi-investor-guide',attribution:'client_reported',occurred_at:'2026-11-18T04:00:00Z',locale:'en'},
 {source_path:'/en/insights/saudi-investor-guide',attribution:'client_reported',occurred_at:'2026-11-18T06:00:00Z',locale:'en'},
 {source_path:'/packages',attribution:'form_page',occurred_at:'2026-11-18T07:00:00Z',locale:'ar'}
];
const measured=summarizeConfirmedLeads(rows);
assert.equal(measured.total,3);
assert.deepEqual(measured.byPage['/en/insights/saudi-investor-guide'],{total:2,clientReported:2,formPage:0});
assert.equal(measured.byPage['/packages'].formPage,1);
assert.equal(summarizeConfirmedLeads([]).total,0,'zero is valid after successful event-store read');
assert.throws(()=>summarizeConfirmedLeads([...rows,{...rows[0],source_path:'https://external.test'}]));
const migration=fs.readFileSync('supabase/migrations/20261118_measured_lead_attribution.sql','utf8');
for(const term of [
 'impact_lead_events','AFTER INSERT ON public.package_requests',
 'ON CONFLICT (request_id) DO NOTHING','origin_path',
 'REFERENCES public.package_requests(id)','ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON public.impact_lead_events FROM PUBLIC,anon,authenticated',
 "'client_reported','form_page'"
])assert(migration.includes(term),'Missing lead event invariant: '+term);
const route=fs.readFileSync('src/app/api/admin/content-impact/route.ts','utf8');
assert(route.includes('if(!authorized(req))'),'PII-free dashboard must still authenticate');
assert(route.includes('impact_lead_events?')&&route.includes('gsc_daily_metrics?'));
assert(route.includes('Promise.allSettled'),'GSC failure must not erase confirmed leads');
assert(!route.includes('select:name,email,phone'),'no personal data in aggregate responses');
const packageRoute=fs.readFileSync('src/app/api/package-requests/route.ts','utf8');
assert(packageRoute.includes('origin_path:originPath'),'request submission sends only validated first-party origin');
assert(packageRoute.includes('const saved = await fetch'),'only persisted requests become conversions via database trigger');
assert(!packageRoute.includes('INSERT INTO impact_lead_events'),'no non-atomic, duplicate event writes');
const page=fs.readFileSync('src/app/insights/[slug]/page.tsx','utf8');
assert(page.includes('?from="+encodeURIComponent('),'article CTA carries a first-party origin');
const form=fs.readFileSync('src/components/packages/usePackageRequest.ts','utf8');
assert(form.includes('sourcePath:new URLSearchParams(window.location.search)'));
const ui=fs.readFileSync('src/components/ContentImpactCenter.tsx','utf8');
assert(ui.includes('طلبات العملاء المحفوظة')&&ui.includes('إحالة المتصفح؛ ليست دليل سببية'));
console.log('PASS confirmed lead persistence, path validation, PII isolation, read-only GSC and admin per-page attribution');
