'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const dashboard=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
const discovery=fs.readFileSync('src/app/api/admin/market/discovery/route.ts','utf8');
const provider=fs.readFileSync('src/lib/provider-search.cjs','utf8');
const editorial=fs.readFileSync('src/components/EditorialReviewPanel.tsx','utf8');
const roles=fs.readFileSync('src/components/AdminDataRoles.tsx','utf8');
const adminRoute=fs.readFileSync('src/app/api/admin/content/route.ts','utf8');
const tests=[
 ['All 12 dashboard sections present',()=>['home','contact','content','agent','reviews','settings','competitors','keywords','opportunities','goals','runs','evidence'].every(x=>dashboard.includes("key: '"+x+"'"))],
 ['Login verifies server secret before unlocking',()=>dashboard.includes("fetch('/api/admin/content',{headers:{'x-admin-secret':key}})")],
 ['Market home loads real data',()=>dashboard.includes("if (tab === 'home') refreshMarket()")],
 ['Refresh fetches market and content',()=>dashboard.includes("Promise.all([fetchContent(),refreshMarket()])")],
 ['No stale competitor or opportunity counts',()=>!dashboard.includes('27 فرصة حالية')&&!dashboard.includes('opportunitie типа')],
 ['No DuckDuckGo-only control',()=>!discovery.includes("allowedSourceIds: ['duckduckgo-html']")&&!dashboard.includes('DuckDuckGo HTML')],
 ['Provider discovery has bounded request budget',()=>provider.includes('maxCalls:3')&&provider.includes('maxPerProvider:1')],
 ['Competitor state editing PATCH exists',()=>dashboard.includes("method:'PATCH',body:JSON.stringify({id:c.id,status})")],
 ['Sources readiness and provider names visible',()=>dashboard.includes('fetchMarketSources')&&dashboard.includes('firecrawl')],
 ['Reviews require confirmation',()=>dashboard.includes("window.confirm('اعتماد ونشر النص النهائي المعروض")],
 ['Save failure keeps editable drafts',()=>dashboard.includes("if(ok)setNewFaq")&&dashboard.includes("if(ok)setEditingFaq")],
 ['User feedback shown accessibly',()=>dashboard.includes('role="alert"')&&dashboard.includes('role="status"')],
 ['Semantic legend present across admin tabs',()=>dashboard.includes('<DataRoleLegend />')&&roles.includes('محتوى مقترح للاستخدام')&&roles.includes('بيانات من النظام')&&roles.includes('روابط رصد وبحث')&&roles.includes('مصادر تحتاج تحققًا')],
 ['Draft generated answer separated from model verification note',()=>dashboard.includes('splitGeoDraftReviewText(d.a)')&&dashboard.includes('عبارة تحقق وردت ضمن النص المولّد')&&dashboard.includes('لن تُنشر إلا إذا كتبتها بنفسك')],
 ['Operator sees and can edit exact final FAQ publish text',()=>dashboard.includes('النص النهائي الذي سيُنشر — قابل للتعديل')&&dashboard.includes('value={finalAnswer}')&&dashboard.includes('a:reviewedAnswer,status:\'approved\'')&&dashboard.includes('{q:draft.q,a:reviewedAnswer}')],
 ['API rejects mismatched or unreviewed published FAQ',()=>adminRoute.includes('Approved FAQ must exactly match the reviewed draft answer')&&adminRoute.includes('Draft approval requires a versioned human review')&&adminRoute.includes('Remove the procedural verification note')],
 ['Draft research never described as verified official source',()=>dashboard.includes('صفحات منافسة ونتائج بحث مرتبطة بالموضوع')&&dashboard.includes('روابط المنافسين ليست مصدرًا رسميًا')],
 ['Editorial source, SEO, metadata and copy in distinct colored sections',()=>editorial.includes('tone="research"')&&editorial.includes('tone="technical"')&&editorial.includes('tone="system"')&&editorial.includes('المحتوى المقترح للاستخدام في الموقع')&&editorial.includes('title="التحقق من المصادر الأصلية قبل النشر"')],
 ['Evidence table scrolls in both axes without squeezing content',()=>dashboard.includes('max-h-[72vh] w-full min-w-0 overflow-auto')&&dashboard.includes('w-[1120px] min-w-[1120px]')&&dashboard.includes('sticky top-0 z-10')&&dashboard.includes('tabIndex={0}')],
 ['Evidence columns explicitly labeled, no fake evidence IDs',()=>dashboard.includes('مراجع الأدلة المرتبطة')&&dashboard.includes('لا توجد أدلة مرتبطة موثقة في السجل')],
];
let failed=0;for(const [name,fn] of tests){try{assert.ok(fn());console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name)}}
console.log('dashboard_contract_tests',JSON.stringify({passed:tests.length-failed,failed}));
if(failed)process.exitCode=1;
