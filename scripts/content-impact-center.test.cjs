'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildImpactInventory,editorialPath,autoPublicationEligibility}=require('../.impact-test-build/content-impact.js');
const {summarizePageImpact}=require('../.impact-test-build/content-impact-metrics.js');
const published={
 id:'ed-published',kind:'guide',lang:'en',target:'investor-documents',slug:'investor-documents',
 title:'Foreign investor documents',summary:'A guide to official sources',body:'A useful detailed guide',
 risk_level:'high',status:'approved',createdAt:'2026-11-17T00:00:00Z',reviewedAt:'2026-11-18T00:00:00Z',
 evidence_ids:['ref-1'],evidence_refs:[],verified_sources:['https://misa.gov.sa/']
};
const pending={...published,id:'ed-pending',kind:'service',target:'company-formation',lang:'zh',slug:undefined,status:'pending',
 title:'沙特外资公司登记流程',reviewedAt:undefined,risk_level:'low',verified_sources:[]};
const technical={...pending,id:'ed-tech',kind:'technical_seo',target:'/',status:'pending'};
const faqs=[{q:'How to start?',a:'Check the original official guidance.'},{q:'Manual question?',a:'Handwritten response.'}];
const drafts=[
 {q:'How to start?',a:'Check the original official guidance.',status:'approved',createdAt:'2026-11-15T00:00:00Z',risk_level:'high'},
 {q:'Pending AI question?',a:'Full answer for review',status:'pending',createdAt:'2026-11-16T00:00:00Z'}
];
const inventory=buildImpactInventory([published,pending,technical],faqs,drafts);
assert.equal(inventory.length,6,'no duplicated approved FAQ and draft');
assert.equal(inventory.filter(x=>x.category==='page').length,2);
assert.equal(inventory.filter(x=>x.category==='faq').length,3);
assert.equal(inventory.find(x=>x.id==='faq:0').origin,'geo_draft');
assert.equal(inventory.find(x=>x.id==='faq:1').origin,'manual_or_legacy');
assert.equal(inventory.find(x=>x.id==='faq:0').lang,'und','do not infer language from question');
assert.equal(inventory.find(x=>x.id==='faq:0').targetPath,'/');
assert.equal(inventory.find(x=>x.id==='draft:1').status,'pending');
assert.equal(inventory.find(x=>x.id==='editorial:ed-published').targetPath,'/en/insights/investor-documents');
assert.equal(inventory.find(x=>x.id==='editorial:ed-pending').targetPath,'/zh/services/company-formation');
assert.equal(inventory.find(x=>x.id==='editorial:ed-tech').targetPath,null);
assert.equal(editorialPath({...pending,kind:'guide',target:'../bad-slug',slug:'../bad-slug'}),null,'unsafe preview slug blocked');
assert.equal(published.status,'approved','inventory is read-only');

const policy={mode:'guarded_automatic',enabled:true,maxDailyPages:3};
const goodContext={hasVersionedRollback:true,hasIdempotencyKey:true,officialSourcesIndependentlyChecked:true};
assert.equal(autoPublicationEligibility(inventory[1],policy,goodContext).eligible,false,'pending page lacks reviewed verified sources');
const eligible={...inventory[1],sourceIds:['reference'],verifiedSources:['https://misa.gov.sa/']};
assert.equal(autoPublicationEligibility(eligible,policy,goodContext).eligible,true,'a future guarded low-risk candidate can qualify only when all proofs exist');
assert.equal(autoPublicationEligibility(eligible,{...policy,enabled:false},goodContext).eligible,false,'default disabled');
assert.equal(autoPublicationEligibility({...eligible,risk:'high'},policy,goodContext).eligible,false,'high-risk never auto-publishes');
assert.equal(autoPublicationEligibility(eligible,{...policy,maxDailyPages:100},goodContext).eligible,false,'unbounded daily quota blocked');
assert.equal(autoPublicationEligibility(eligible,policy,{...goodContext,hasVersionedRollback:false}).eligible,false,'rollback required');

const prop='https://saudi-investor.example/';
const rows=[
 {property:prop,dimension:'page',dimension_value:prop+'en/insights/investor-documents',metric_date:'2026-11-14',clicks:3,impressions:30,position:4,captured_at:'2026-11-17T12:00:00Z'},
 {property:prop,dimension:'page',dimension_value:prop+'en/insights/investor-documents/',metric_date:'2026-11-15',clicks:1,impressions:70,position:6,captured_at:'2026-11-17T15:00:00Z'},
 {property:prop,dimension:'page',dimension_value:prop+'en/services/company-formation',metric_date:'2026-11-15',clicks:0,impressions:0,position:0,captured_at:'2026-11-17T15:00:00Z'},
 {property:prop,dimension:'total',dimension_value:'',metric_date:'2026-11-15',clicks:300,impressions:500,position:1,captured_at:'2026-11-17T15:00:00Z'},
 {property:'https://other.example/',dimension:'page',dimension_value:prop+'en/insights/investor-documents',metric_date:'2026-11-15',clicks:99,impressions:100,position:1,captured_at:'2026-11-17T15:00:00Z'},
 {property:prop,dimension:'page',dimension_value:prop+'en/insights/investor-documents?duplicate=1',metric_date:'2026-11-15',clicks:7,impressions:8,position:1,captured_at:'2026-11-17T15:00:00Z'},
];
const impact=summarizePageImpact(rows,28,prop);
assert.equal(impact.status,'available');
assert.equal(impact.pages['/en/insights/investor-documents'].clicks,4);
assert.equal(impact.pages['/en/insights/investor-documents'].impressions,100);
assert.equal(impact.pages['/en/insights/investor-documents'].ctr,0.04);
assert.equal(impact.pages['/en/insights/investor-documents'].position,5.4);
assert.equal(impact.pages['/en/insights/investor-documents'].observedDays,2);
assert.equal(impact.pages['/en/services/company-formation'].clicks,0,'real zero allowed with page evidence');
assert.equal(impact.pages['/no-data'],undefined,'no observation must remain unknown');
const absent=summarizePageImpact(rows.filter(x=>x.dimension==='total'),7,prop);
assert.equal(absent.status,'no_page_rows');
assert.deepEqual(absent.pages,{},'site totals are NOT page data');

const route=fs.readFileSync('src/app/api/admin/content-impact/route.ts','utf8');
assert(route.includes("if(!authorized(req))")&&route.includes("return NextResponse.json({error:'unauthorized'},{status:401})"));
assert(route.includes('dimension:\'eq.page\''));
assert(route.includes("rows.length>=5000"),'truncated metrics fail closed');
assert(!route.includes("method:'POST'"),'metrics API read-only');
const center=fs.readFileSync('src/components/ContentImpactCenter.tsx','utf8');
assert(center.includes('معاينة وتفاصيل')&&center.includes('حذف نهائي')&&center.includes('إلغاء النشر / أرشفة'));
assert(center.includes("counted?number(sumViews):'—'"),'missing GSC data must never render zero');
assert(center.includes('لا يعمل تلقائيًا'),'future automatic publishing must be visibly disabled');
const dashboard=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
assert(dashboard.includes("key: 'impact'")&&dashboard.includes('<ContentImpactCenter'));
console.log('PASS GEO Impact Center inventory, safe preview, no duplicated FAQ, unknown metrics, read-only GSC, fail-closed guarded auto publication and versioned admin controls');
