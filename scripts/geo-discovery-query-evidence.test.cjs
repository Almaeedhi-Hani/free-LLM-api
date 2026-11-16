'use strict';
const assert=require('node:assert/strict');
const provider=require('../src/lib/provider-search.cjs');
const originalConfigured=provider.configured;
const originalSearch=provider.search;
provider.configured=()=>['fixture'];
provider.search=async()=>({
 results:[
  ...Array.from({length:6},(_,i)=>({url:'https://same.example/page-'+i,domain:'same.example',title:'Page '+i,query:'company formation Saudi Arabia foreign investor',language:'en',source:'fixture'})),
  {url:'https://same.example/page-0#fragment',domain:'same.example',title:'Duplicate',query:'company formation Saudi Arabia foreign investor',language:'en',source:'fixture'},
  {url:'https://same.example/page-0',domain:'same.example',title:'Arabic result',query:'تأسيس شركة في السعودية للأجانب',language:'ar',source:'fixture'}
 ],diagnostics:[]
});
(async()=>{
 try{
  const {collect}=require('./geo-discovery-sources.cjs');
  const result=await collect({fetchFn:async()=>({ok:true,status:200,json:async()=>[null,[]]})});
  const en=result.competitors.filter(x=>x.language==='en');
  assert.equal(en.length,5,'Keep five distinct pages from one domain for one query');
  assert.equal(new Set(en.map(x=>x.url)).size,5);
  assert.equal(result.competitors.filter(x=>x.language==='ar').length,1,'Do not deduplicate across languages');
  assert.ok(result.competitors.every(x=>x.verification==='candidate'));
  console.log('PASS: GEO discovery preserves query-level page evidence without inventing rank');
 }finally{provider.configured=originalConfigured;provider.search=originalSearch}
})().catch(e=>{console.error(e);process.exitCode=1});
