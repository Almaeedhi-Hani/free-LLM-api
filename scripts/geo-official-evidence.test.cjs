'use strict';
const assert=require('node:assert/strict');
const {collectOfficialEvidence,configuredSources,bindClaimEvidence,editorialCopy}=require('./geo-official-evidence.cjs');
(async()=>{
 const sources=configuredSources();assert.equal(sources.length,6);
 const quote='This fictional fixture describes the exact text observed on a mocked government source for regression testing.';
 let calls=0;
 const report=await collectOfficialEvidence(async(url,options)=>{
  calls++;assert(sources.some(s=>s.url===url));assert.equal(options.redirect,'manual');
  if(calls===2)return new Response('',{status:302,headers:{location:'https://example.invalid'}});
  if(calls===3)return new Response('x'.repeat(600001),{headers:{'content-type':'text/html'}});
  return new Response('<script><p>Never use this hidden text as official evidence.</p></script><p>'+quote+'</p>',{headers:{'content-type':'text/html'}});
 });
 assert.equal(calls,6);assert.equal(report.items.length,4);
 assert(report.items.every(x=>x.snippet===quote&&x.type==='official_candidate'));
 const e=report.items[0],ids=[e.id],map=new Map([[e.id,e]]);
 const match={evidence_id:e.id,claim:quote,quote};
 assert.deepEqual(bindClaimEvidence([match],quote,ids,map),[{claim:quote,quote,url:e.url}]);
 assert.deepEqual(bindClaimEvidence([{...match,quote:'A fabricated source quotation that never appeared in the observed text.'}],quote,ids,map),[]);
 assert.deepEqual(bindClaimEvidence([match], 'Different article copy.',ids,map),[]);
 assert.deepEqual(bindClaimEvidence([match],quote,[],map),[]);
 assert(editorialCopy({title:'Title',summary:'Summary',body:'Body',sections:[{h2:'Heading',body:'Section',subsections:[{h3:'Nested',body:'Nested body'}]}],internal_links:[{anchor:'Link'}]}).includes('Nested body Link'));
 console.log('PASS bounded official source collection, redirect rejection, and claim provenance');
})().catch(e=>{console.error(e);process.exitCode=1});
