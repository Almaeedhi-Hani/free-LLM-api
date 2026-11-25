'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {buildPublishedLinks,buildUnpublishedPreviews}=require('../.published-links-test-build/lib/published-links.js');
const admin=require('./support/admin-dashboard-source.cjs').readAdminDashboardSource();
const ui=fs.readFileSync('src/components/PublishedLinksList.tsx','utf8');
const approved=(id,kind,lang,extra={})=>({
 id,kind,lang,target:'misa-license',title:'Page '+id,summary:'Summary',body:'body',
 status:'approved',risk_level:'low',createdAt:'2026-11-18T00:00:00Z',
 reviewedAt:'2026-11-19T10:00:00Z',evidence_ids:[],evidence_refs:[],...extra
});
const editorial=[
 approved('a','service','en',{approval_method:'human',verified_sources:['https://example.gov.sa']}),
 approved('b','guide','zh',{slug:'valid-guide',approval_method:'automated'}),
 approved('c','service','ar',{approval_method:'human',verified_sources:[],reviewedAt:'2026-11-19T09:00:00Z'}), // not live
 {...approved('d','guide','en',{slug:'pending-guide',approval_method:'automated'}),status:'pending'},
 approved('e','technical_seo','ar',{approval_method:'automated'}), // no page path
];
const faqs=[
 {q:'Is my FAQ live?',a:'Published answer',approval_method:'human'},
 {q:'STORAGE_TEST_not_live',a:'Fixture sentinel'},
];
const drafts=[{q:'Unpublished FAQ',a:'Do not link me',createdAt:'2026-11-19T00:00:00Z',status:'pending'}];
const events=[
 {id:'event1',kind:'editorial',item_id:'b',status:'published',published_at:'2026-11-20T02:00:00Z'},
 {id:'event2',kind:'editorial',item_id:'d',status:'published',published_at:'2026-11-20T03:00:00Z'}, // no draft promotion
 {id:'event3',kind:'editorial',item_id:'a',status:'rolled_back',rolled_back_at:'2026-11-20T03:30:00Z',published_at:'2026-11-20T02:30:00Z'},
 {id:'event4',kind:'faq',item_id:'Is my FAQ live?',status:'rolled_back',rolled_back_at:'2026-11-20T03:30:00Z',published_at:'2026-11-20T02:30:00Z'}
];
const links=buildPublishedLinks(editorial,faqs,events);
assert.equal(links.length,3,'2 valid route-backed editorial items and 1 live FAQ');
assert.deepEqual(new Set(links.map(x=>x.path)),new Set(['/en/services/misa-license','/zh/insights/valid-guide','/']));
assert(links.every(x=>x.id!=='editorial:d'&&x.id!=='editorial:c'&&x.id!=='editorial:e'),'No invalid or draft article');
assert(links.some(x=>x.id==='editorial:b'&&x.publicationSource==='آلي'),'Real automatic publication attribution');
assert(links.some(x=>x.id==='editorial:a'&&x.publicationSource==='يدوي'),'Rolled-back event cannot claim an automatic publication');
assert(links.some(x=>x.kind==='faq'&&x.language==='ar'&&x.publicationSource==='يدوي'),'FAQ manual attribution and Arabic route');
const previews=buildUnpublishedPreviews(editorial,drafts);
assert.equal(previews.length,2,'Pending editorial and FAQ drafts remain separate');
assert(previews.every(x=>!('path' in x)&&!('url' in x)),'Unpublished drafts never receive a public URL');
assert(admin.includes("key: 'published_links'")&&admin.includes('<PublishedLinksList'),'Independent published links navigation');
assert(!/<details id="unpublished-previews"[^>]+\sopen(?:=|\s|>)/.test(ui),'Drafts collapsed by default');
assert(ui.includes('role="status"')&&ui.includes("cache:'no-store'"),'Fresh authenticated publication reads');
(async()=>{
 const base=process.env.PUBLISHED_LINKS_TEST_BASE_URL;
 if(base){
  for(const link of links){
   const response=await fetch(new URL(link.path,base),{redirect:'follow'});
   assert.equal(response.status,200,'HTTP 200 for published test path '+link.path);
  }
  console.log('PASS Published URLs returned HTTP 200: '+links.length+' source-backed entries');
 }
 console.log('PASS PublishedLinksList: confirmed source count, safe paths, provenance, rollback, unpublished isolation and RTL navigation');
})().catch(error=>{console.error(error);process.exitCode=1;});
