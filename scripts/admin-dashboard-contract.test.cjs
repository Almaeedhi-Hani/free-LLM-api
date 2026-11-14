'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const dashboard=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
const discovery=fs.readFileSync('src/app/api/admin/market/discovery/route.ts','utf8');
const provider=fs.readFileSync('src/lib/provider-search.cjs','utf8');
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
 ['Reviews require confirmation',()=>dashboard.includes('window.confirm(\'اعتماد هذه المسودة')],
 ['Save failure keeps editable drafts',()=>dashboard.includes("if(ok)setNewFaq")&&dashboard.includes("if(ok)setEditingFaq")],
 ['User feedback shown accessibly',()=>dashboard.includes('role="alert"')&&dashboard.includes('role="status"')]
];
let failed=0;for(const [name,fn] of tests){try{assert.ok(fn());console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name)}}
console.log('dashboard_contract_tests',JSON.stringify({passed:tests.length-failed,failed}));
if(failed)process.exitCode=1;
