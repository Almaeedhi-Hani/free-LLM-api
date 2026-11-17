'use strict';
const assert=require('node:assert/strict');
const {collect,selectSeeds,isInvestorKeyword}=require('./geo-discovery-sources.cjs');
const provider=require('../src/lib/provider-search.cjs');

(async()=>{
 const configured=provider.configured;
 provider.configured=()=>[]; // isolate the no-key Bing RSS branch; never call a paid provider.
 try{
  const at=new Date('2026-11-17T12:00:00Z');
  const short={ar:'تأسيس شركة في السعودية',en:'Saudi company formation',zh:'沙特公司注册'};
  const shortTerm={ar:'تأسيس شركات في المملكة العربية السعودية',en:'Saudi company formation requirements',zh:'沙特公司注册步骤'};
  const calls=[];
  const fakeFetch=async(url)=>{
   const u=new URL(url);
   if(u.hostname==='suggestqueries.google.com'){
    const lang=u.searchParams.get('hl'),query=u.searchParams.get('q');
    calls.push({lang,query});
    return {ok:true,status:200,json:async()=>[query,query===short[lang]?[shortTerm[lang]]:[]]};
   }
   assert.equal(u.hostname,'www.bing.com','no other provider or destination allowed in mock');
   return {ok:true,status:200,text:async()=>'<rss><channel></channel></rss>'};
  };
  const result=await collect({fetchFn:fakeFetch,now:at});
  assert.equal(calls.length,6,'only one bounded shorter-query fallback per locale');
  assert.deepEqual(result.suggestions.map(x=>x.language),['ar','en','zh']);
  assert.deepEqual(result.suggestions.map(x=>x.term),[shortTerm.ar,shortTerm.en,shortTerm.zh]);
  assert(result.suggestions.every(x=>x.source==='google-suggest'&&!('rank' in x)&&!('search_volume' in x)));
  assert.equal(result.diagnostics.filter(x=>x.source==='google-suggest'&&x.variant==='short_fallback'&&x.count===1).length,3);
  assert.equal(result.diagnostics.filter(x=>x.source==='google-suggest'&&x.reason==='empty_suggestions').length,3);

  let primaryRequests=0;
  const primary=await collect({now:at,fetchFn:async url=>{
   const u=new URL(url);
   if(u.hostname==='suggestqueries.google.com'){
    primaryRequests++;
    return {ok:true,status:200,json:async()=>[u.searchParams.get('q'),[u.searchParams.get('q')+' suggested']]};
   }
   return {ok:true,status:200,text:async()=>'<rss><channel></channel></rss>'};
  }});
  assert.equal(primaryRequests,3,'successful primary suggestions must not consume fallback requests');
  assert.equal(primary.suggestions.length,3);
  assert.equal(primary.diagnostics.filter(x=>x.variant==='short_fallback').length,0);

  let emptyRequests=0;
  const empty=await collect({now:at,fetchFn:async url=>{
   const u=new URL(url);
   if(u.hostname==='suggestqueries.google.com'){
    emptyRequests++;
    return {ok:true,status:200,json:async()=>[u.searchParams.get('q'),[]]};
   }
   return {ok:true,status:200,text:async()=>'<rss><channel></channel></rss>'};
  }});
  assert.equal(emptyRequests,6,'even empty Suggest must remain tightly bounded');
  assert.equal(empty.suggestions.length,0,'HTTP 200 without suggestions must not create fictional keywords');
  assert.equal(empty.diagnostics.filter(x=>x.source==='google-suggest'&&x.reason==='empty_suggestions').length,6);
  assert.equal(empty.status,'blocked');

  // Production Google Suggest returned off-topic completions such as
  // "Saudi Arabia formation football". They are genuine autocomplete
  // strings but not relevant investment queries and must NOT be persisted.
  for(const [lang,term] of [
   ['ar','تأسيس شركة في السعودية لغير السعوديين'],
   ['en','saudi company formation cost'],
   ['en','MISA foreign investor license'],
   ['zh','沙特公司注册流程']
  ])assert(isInvestorKeyword(term,lang),lang+' should retain business query '+term);
  for(const [lang,term] of [
   ['en','saudi arabia formation football'],
   ['en','saudi arabia formation date'],
   ['en','saudi arabia formation day'],
   ['en','saudi arabia formation world cup'],
   ['en','saudi arabia formation year'],
   ['ar','كأس العالم لكرة القدم في السعودية'],
   ['zh','沙特世界杯足球']
  ])assert(!isInvestorKeyword(term,lang),lang+' must exclude off-topic query '+term);

  let filteredRequests=0;
  const filtered=await collect({now:at,fetchFn:async url=>{
   const u=new URL(url);
   if(u.hostname==='suggestqueries.google.com'){
    filteredRequests++;
    const lang=u.searchParams.get('hl'),q=u.searchParams.get('q');
    const terms=lang==='en'?(q==='Saudi company formation'?
     ['Saudi company formation cost']:['saudi arabia formation football','saudi arabia formation date']):
     lang==='ar'?['تأسيس شركة في السعودية لغير السعوديين']:
      ['沙特公司注册流程'];
    return {ok:true,status:200,json:async()=>[q,terms]};
   }
   return {ok:true,status:200,text:async()=>'<rss><channel></channel></rss>'};
  }});
  assert.equal(filteredRequests,4,'irrelevant English primary must cause one short fallback');
  assert.deepEqual(filtered.suggestions.map(x=>x.language),['ar','en','zh']);
  assert.equal(filtered.suggestions.find(x=>x.language==='en').term,'Saudi company formation cost');
  assert.equal(filtered.diagnostics.filter(x=>x.reason==='no_relevant_suggestions').length,1);
  assert.equal(filtered.diagnostics.find(x=>x.reason==='no_relevant_suggestions').rejected,2);

  const seeds=selectSeeds(at);
  assert.equal(seeds.length,3,'rotating research seeds remain unchanged');
  console.log('PASS bounded multilingual Google Suggest fallback: 3 primary + at most 3 short alternatives, truthful empty diagnostics, no fabricated keyword or paid-provider request');
 }finally{
  provider.configured=configured;
 }
})().catch(error=>{console.error(error);process.exitCode=1});
