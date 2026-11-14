'use strict';
const fs=require('node:fs');
const m=require('../.market-test-build/open-search-sources.js');
(async()=>{const providers=[];for(const source of [new m.BingRssSearchSource(),new m.DuckDuckGoHtmlSource()]){
 const results=await source.collectResults('Saudi company formation services','en',4);
 providers.push({name:source.id,diagnostic:source.lastDiagnostic,results:results.map(x=>({domain:x.domain,url:x.url,title:x.title}))});
}
fs.mkdirSync('.search-probe',{recursive:true});
fs.writeFileSync('.search-probe/report.json',JSON.stringify({checked_at:new Date().toISOString(),providers},null,2));
console.log('LIVE_SEARCH_REPORT',JSON.stringify(providers));
})().catch(e=>{console.error(String(e));process.exitCode=1});
