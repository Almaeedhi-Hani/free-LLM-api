'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const policy=require('../.impact-test-build/lib/source-policy.js');
const store=require('../.impact-test-build/lib/source-policy-store.js');

(async()=>{
 const live=['https://www.motaded.com.sa/services','www.law.shangiti.com'];
 assert.equal(policy.normalizeCompetitorDomain('https://www.motaded.com.sa/services'),'motaded.com.sa');
 assert.equal(policy.isCompetitorUrl('https://guide.motaded.com.sa/path',live),true);
 assert.equal(policy.isCompetitorUrl('https://motaded.com.sa.evil.test/',live),false);
 assert.equal(policy.isCompetitorUrl('https://investmentaxis.com.sa/a'),true);
 assert.equal(policy.isCompetitorUrl('https://jewark.com/a'),true);
 assert.equal(policy.isCompetitorUrl('https://misa.gov.sa/a',[],'competitor_candidate'),true);
 assert.equal(policy.isDisplayable('https://misa.gov.sa/'),true);
 assert.equal(policy.isWhitelistedOfficial('https://sub.misa.gov.sa/en/'),true);
 assert.equal(policy.isWhitelistedOfficial('https://misa.gov.sa.evil.test/'),false);
 assert.equal(policy.isDisplayable('http://misa.gov.sa/'),false);
 assert.equal(policy.isDisplayable('https://user@misa.gov.sa/'),false);
 assert.equal(policy.isDisplayable('https://www.motaded.com.sa/',live),false);
 assert.deepEqual(policy.auditBody('Read https://www.motaded.com.sa/a and https://misa.gov.sa/.',live),
  ['https://www.motaded.com.sa/a']);
 let called=0;
 const mock=async (url,options)=>{
  called++;
  assert(url.includes('competitors?select=domain&status=eq.active'));
  assert.equal(options.cache,'no-store');
  return {ok:true,json:async()=>[{domain:'www.motaded.com.sa'},{domain:'https://law.shangiti.com/a'}]};
 };
 assert.deepEqual(await store.getCompetitorDomains(mock,{url:'https://example.supabase.co',key:'test'}),['motaded.com.sa','law.shangiti.com']);
 assert.equal(called,1);
 await assert.rejects(()=>store.getCompetitorDomains(async()=>({ok:false,status:503}),{url:'https://example.supabase.co',key:'test'}),/competitor_source_read/);
 const page=fs.readFileSync('src/app/insights/[slug]/page.tsx','utf8');
 const worker=fs.readFileSync('src/lib/geo-auto-publication.ts','utf8');
 assert(page.includes('getCompetitorDomains()')&&page.includes('isDisplayable(source,competitorDomains)'));
 assert(page.includes('nofollow noopener noreferrer'));
 assert(worker.includes('optionalResearchCitations(candidate,competitorDomains)'));
 assert(!worker.includes("method:'DELETE'"));
 console.log('PASS live competitor domain isolation, public references, source audit, fail-closed loading');
})().catch(err=>{console.error(err);process.exitCode=1});
