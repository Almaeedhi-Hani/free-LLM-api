'use strict';
const assert=require('node:assert/strict'),{collect,parseRss}=require('./geo-discovery-sources.cjs');
const xml='<?xml version="1.0"?><rss><channel><item><title>Company Formation in Saudi Arabia - Help</title><link>https://firm.example.sa/service</link><description>Foreign investor company formation</description></item><item><title>Saudi Arabia News</title><link>https://news.example.com/latest</link><description>Updates</description></item></channel></rss>';
assert.equal(parseRss(xml,'company formation Saudi Arabia','en').length,1);
const mocked=async url=>url.includes('suggestqueries.google.com')?
 {ok:true,status:200,json:async()=>['query',['تأسيس شركة في السعودية','تأسيس شركة في السعودية']]}:
 {ok:true,status:200,text:async()=>xml};
collect({fetchFn:mocked}).then(result=>{
 assert.equal(result.status,'success');
 assert.equal(result.competitors.length,1);
 assert.equal(result.suggestions.length,3);
 assert.equal(result.diagnostics.length,6);
 console.log('PASS Google keyword collection, duplicate suppression, sourced competitor and 6-call budget');
}).catch(e=>{console.error(e);process.exitCode=1});
