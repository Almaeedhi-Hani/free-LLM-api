'use strict';
const fs=require('node:fs'),{collect}=require('./geo-discovery-sources.cjs');
collect().then(result=>{
 fs.mkdirSync('.search-probe',{recursive:true});
 const report={at:new Date().toISOString(),status:result.status,
  competitors:result.competitors.map(x=>({url:x.url,title:x.title,language:x.language,source:x.source})),
  suggestions:result.suggestions.slice(0,12),diagnostics:result.diagnostics};
 fs.writeFileSync('.search-probe/geo-discovery-report.json',JSON.stringify(report,null,2));
 console.log('GEO_LIVE_DISCOVERY',JSON.stringify(report));
}).catch(e=>{console.error('GEO_DISCOVERY_ERROR',String(e));process.exitCode=1});
