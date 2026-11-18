'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const admin=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
const nav=admin.slice(admin.indexOf('const NAV_HUBS:'),admin.indexOf('export default function AdminDashboard'));
assert(nav.length>400,'Grouped hub navigation missing');
const hubs=[...nav.matchAll(/\{key:'([^']+)',label:'([^']+)',icon:'[^']+',landing:'([^']+)',tabs:\[([^\]]+)\]\}/g)];
assert.equal(hubs.length,7,'Exactly seven top-level admin hubs');
const all=hubs.flatMap(m=>[...m[4].matchAll(/'([^']+)'/g)].map(x=>x[1]));
assert.equal(all.length,18,'All original eighteen screens remain reachable');
assert.equal(new Set(all).size,18,'Every child screen has exactly one home');
assert.equal(new Set(hubs.map(m=>m[2])).size,7);
for(const m of hubs)assert(m[4].includes("'"+m[3]+"'"),m[2]+' default page must be in its group');
assert(!admin.includes('TABS.map((t)'),'No obsolete flat eighteen-item sidebar');
assert(admin.includes('NAV_HUBS.map(hub=>'),'Grouped sidebar must actually render');
assert(admin.includes('aria-expanded={expanded}'),'Accessible menu state');
assert(admin.includes("setSidebarOpen(false)"),'Mobile child menu must close after selecting destination');
assert(admin.includes('<UnifiedRunHistory secret={secret} legacyRuns={runs} />'));
const store=fs.readFileSync('src/lib/content-store.ts','utf8');
assert(store.includes('keywords:')&&!admin.includes('كلمات محتوى الموقع'),
 'Legacy keyword data still exists in persistent content schema; duplicate UI editor is removed');
const impact=fs.readFileSync('src/components/ContentImpactCenter.tsx','utf8');
assert(impact.includes('<GeoImpactExperiments adminSecret={adminSecret} days={days}/>'),
 'Live conversion and AI impact center remains accessible');
const visibility=fs.readFileSync('src/components/VisibilityDashboard.tsx','utf8');
assert(visibility.includes('type Section=\'pages\'|\'queries\';'),
 'SEO screen must contain only active measurement types');
assert(visibility.includes('onOpenImpact'),'Visitors to analytics can reach real impact center');
assert(!visibility.includes("section==='ai'")&&!visibility.includes("section==='conversions'"),
 'Legacy empty AI/conversion panels must not be visible');
const runs=fs.readFileSync('src/components/UnifiedRunHistory.tsx','utf8');
for(const endpoint of ['/api/admin/geo-engine','/api/admin/geo-publication'])assert(runs.includes(endpoint));
assert(runs.includes('legacyRuns')&&runs.includes('سجل التشغيل والنشر الموحد'));
assert(runs.includes('لا يعني ذلك أن المحرك لم يعمل'),
 'Empty legacy tables must not be presented as evidence of failed production workflow');
const engine=fs.readFileSync('src/components/GeoEngineMonitor.tsx','utf8');
assert(!engine.includes('التشغيل اليدوي غير متاح من هذه الواجهة'));
assert(!engine.includes('لا ينشر المحتوى تلقائيًا'));
const consent=fs.readFileSync('src/components/CookieConsent.tsx','utf8');
assert(consent.includes("pathname?.startsWith('/admin')"),'No public cookie overlay should obstruct private admin navigation');
assert(admin.includes('تشغيل المحرك من وكيل GEO'));
assert(admin.includes('خيارات تشغيل الرادار والتحليل القديم (متقدمة)'));
assert(admin.includes("label: 'سجلات التحليل القديم'"),
 'Historical market log must not be mistaken for current GitHub run count');
console.log('PASS 7 admin hubs / 18 preserved child screens, single active impact center and real GitHub/publication run log');
