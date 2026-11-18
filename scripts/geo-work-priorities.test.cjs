'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {prioritizeGeoWork}=require('../.impact-test-build/lib/geo-work-priorities.js');

const make=(id,overrides={})=>({
 id,kind:'guide',category:'page',lang:'ar',
 title:id,summary:'Test proposal',body:'Content is not published',
 status:'pending',origin:'geo_editorial',
 createdAt:'2026-11-17T10:00:00Z',updatedAt:null,targetPath:'/insights/'+id,
 risk:'high',sourceIds:[],verifiedSources:[],sections:[],primaryKeyword:null,
 itemId:id,draftIndex:null,faqIndex:null,...overrides
});
const pages=[
 make('older',{targetPath:'/en/services/company-formation',lang:'en'}),
 make('newer',{targetPath:'/services/company-formation',createdAt:'2026-11-18T10:00:00Z'}),
 make('task',{kind:'technical_seo',category:'task',targetPath:null}),
 make('faq',{kind:'faq_draft',category:'faq',targetPath:null,lang:'und'}),
 make('published',{status:'published',targetPath:'/insights/published'}),
 make('rejected',{status:'rejected'}),
];
const source={
 source:'gsc_daily_page',days:28,status:'available',
 pages:{
  '/en/services/company-formation':{
   clicks:1,impressions:80,ctr:0.0125,position:9,observedDays:2,capturedAt:'2026-11-17T08:00:00Z'
  }
 },
 message:'Observed only',leads:{
  status:'available',total:2,
  byPage:{
   '/en/services/company-formation':{total:2,clientReported:1,formPage:1}
  },message:'Browser-reported origin is not causation.'
 }
};
const result=prioritizeGeoWork(pages,source);
assert.equal(result.length,4,'exclude published/rejected work');
assert.equal(result[0].item.id,'older','a matching observed lead and GSC record may inform an already pending proposal');
assert.equal(result[0].basis,'reported_lead');
assert.equal(result[0].clientReportedLeads,1);
assert.equal(result[0].metric.impressions,80);
assert.equal(result.find(x=>x.item.id==='newer').basis,'unmeasured',
 'an English page measurement must not leak into the Arabic path');
assert.equal(result.find(x=>x.item.id==='task').action,'technical_handoff');
assert.equal(result.find(x=>x.item.id==='faq').action,'review_faq');
assert.equal(result[1].item.id,'newer','unmeasured content before technical tasks then FAQ drafts');
assert.equal(result[2].item.id,'task');
assert.equal(result[3].item.id,'faq');
const missing=prioritizeGeoWork(pages,{...source,status:'no_page_rows',pages:{},leads:{status:'unavailable',total:null,byPage:{},message:'unavailable'}});
assert(missing.every(x=>x.basis==='unmeasured'),'missing metrics must not become zero or estimated traffic');
assert(missing.every(x=>x.metric===null&&x.clientReportedLeads===null));
const none=prioritizeGeoWork(pages,null);
assert(none.every(x=>x.basis==='unmeasured'));
assert.equal(none[0].item.id,'older','stable queue falls back to operational age ordering');
const onlyForm=prioritizeGeoWork(pages,{...source,leads:{...source.leads,byPage:{
 '/en/services/company-formation':{total:1,clientReported:0,formPage:1}
}}});
assert.equal(onlyForm[0].basis,'observed_gsc','form-page attribution alone is not a client-reported page lead');
const zeroObservation=prioritizeGeoWork(pages,{...source,leads:{status:'available',total:0,byPage:{},message:'none'},pages:{
 '/en/services/company-formation':{...source.pages['/en/services/company-formation'],clicks:0,impressions:0,ctr:null,position:null}
}});
assert.equal(zeroObservation[0].basis,'observed_gsc','an actual stored zero-impression page row is different from missing rows');
assert.equal(zeroObservation[0].metric.impressions,0);
assert.equal(pages[0].status,'pending','priority is read-only; no approval or publication side effects');

const ui=fs.readFileSync('src/components/GeoWorkPriorities.tsx','utf8');
const center=fs.readFileSync('src/components/ContentImpactCenter.tsx','utf8');
assert(ui.includes('لا ينشر محتوى ولا ينفذ كودًا بمفرده'));
assert(ui.includes('ليس دليلًا على سبب التحويل'));
assert(ui.includes('onPreview(item.id)'),'must open actual editorial preview');
assert(center.includes('<GeoWorkPriorities '),'component is displayed on authenticated content dashboard');
assert(!ui.includes("fetch("),'priority screen must not invoke write endpoints or expose credentials');
console.log('PASS GEO operational work queue: exact page evidence, unknown-data preservation, separate form/lead attribution, pending-only, no publishing');
