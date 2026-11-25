'use strict';
/** Current product contract, not obsolete 12-section assumptions.
 * The isolated Chromium suite verifies real buttons and persistence. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const get=path=>fs.readFileSync(path,'utf8');
const dashboard=require('./support/admin-dashboard-source.cjs').readAdminDashboardSource();
const impact=get('src/components/ContentImpactCenter.tsx');
const visibility=get('src/components/VisibilityDashboard.tsx');
const requests=get('src/components/PackageRequestsAdmin.tsx');
const review=get('src/components/EditorialReviewPanel.tsx');
const technical=get('src/components/TechnicalTaskBoard.tsx');
const runs=get('src/components/UnifiedRunHistory.tsx');
const cookies=get('src/components/CookiePolicyAdmin.tsx');
const integrations=get('src/components/SearchIntegrationsAdmin.tsx');
const testBrowser=get('scripts/admin-18-functional-acceptance-browser.cjs');
const testHubs=get('scripts/admin-seven-hubs-browser-e2e.cjs');
const liveApi=get('src/app/api/admin/visibility/route.ts');
const contentApi=get('src/app/api/admin/content/route.ts');
const pages=[
 'home','competitors','keywords','opportunities','goals','agent',
 'runs','evidence','content','reviews','editorial','impact','contact',
 'package_requests','visibility','cookies','integrations','settings'
];
for(const name of pages){
 assert(dashboard.includes("key: '"+name+"'"),'Admin page missing from NAV: '+name);
 assert(testHubs.includes(name==='home'?'الرئيسية':{
  competitors:'المنافسون',keywords:'كلمات البحث السوقية',opportunities:'الفرص',
  goals:'الأهداف',agent:'وكيل GEO',runs:'سجل التشغيل',evidence:'الأدلة ومصادر النتائج',
  content:'محتوى الموقع',reviews:'اعتماد المسودات',editorial:'تطوير جميع صفحات الموقع',
  impact:'مركز المحتوى والأثر',contact:'التواصل',package_requests:'طلبات الباقات',
  visibility:'SEO وظهور الذكاء الاصطناعي',cookies:'إدارة الكوكيز',
  integrations:'SEO والتكاملات',settings:'الإعدادات'
 }[name]),'Browser navigation missing page '+name);
}
const hubs=['overview','market','strategy','contentHub','measurement','customers','operations'];
for(const name of hubs)assert(dashboard.includes("key:'"+name+"'"),'Missing main navigation hub '+name);
assert(dashboard.includes('setContactForm(contactToForm(data.contact))'),
 'First login must hydrate language-specific contact/profile fields');
assert(!dashboard.includes('setContactForm(data.contact)'),
 'Raw backend contact cannot be assigned to admin form state');
for(const name of ['fetchContent','refreshMarketCollection','refreshAll','fetchEvidence',
 'saveContact','addFaq','updateFaq','deleteFaq','approveDraft','rejectDraft'])
 assert(dashboard.includes(name),'Missing dashboard handler '+name);
for(const snippet of ['<ContentImpactCenter','<EditorialReviewPanel','<UnifiedRunHistory',
 '<TechnicalTaskBoard','<PackageRequestsAdmin','<VisibilityDashboard',
 '<CookiePolicyAdmin','<SearchIntegrationsAdmin'])
 assert(dashboard.includes(snippet),'Missing subordinate view '+snippet);
assert(impact.includes('GeoImpactExperiments'),'Measured before/after comparison must remain visible');
assert(!impact.includes('يُوضح ذلك صراحة لزوار الموقع'),'Visitor-facing verification notice must not be reintroduced or promised in admin copy');
assert(visibility.includes('onOpenImpact'),'SEO links to measured content impact, not a second conversion dashboard');
assert(visibility.includes('فحص HTTP لا يثبت فهرسة Google'),
 'HTTP checks must never be labelled as verified Google indexing');
assert(liveApi.includes('const entries=await sitemap()'),
 'SEO page checks must cover dynamic published sitemap entries');
for(const x of ['saved','contacted','closed'])assert(requests.includes('value="'+x+'"'),
 'Customer lifecycle status not available: '+x);
assert(requests.includes('action:"update_status"'),'Lead-status button must write to the backend');
assert(review.includes('onSaveItems'),'Editorial edits require persistent save handler');
assert(technical.includes("payload.status!=='issue_open'"),
 'Technical suggestions must not be marked implemented after issuing an issue');
assert(runs.includes("/api/admin/geo-engine")&&runs.includes("/api/admin/geo-publication"),
 'Unified run history should source actual workflow and publishing log');
assert(cookies.includes('onSave(draft)'),'Consent settings must be persistently editable');
assert(integrations.includes('onSave({...draft'),'Integration form must persist validated settings');
assert(contentApi.includes('expectedUpdatedAt')&&contentApi.includes('StorageConflictError'),
 'Concurrent edits should report version conflicts rather than silently overwrite');
for(const x of ['Homepage golden paragraph editor saves',
 'FAQ full-detail preview opens',
 'Editorial preview, edit and two-confirmation deletion',
 'Contact save and persistent multilingual advisor readback',
 'FAQ add/edit/delete buttons persist','Keyword create/update/delete',
 'Goal create/status update','Draft review rejection',
 'Cookie duration edit','Search integration setting persisted',
 'Content impact API reports','Logout returns'])
 assert(testBrowser.includes(x),'Functional browser suite missing checkpoint '+x);
console.log('PASS 18 admin pages / seven hubs / readback handlers / accurate GEO+GSC sources / production-safe browser acceptance contracts');
