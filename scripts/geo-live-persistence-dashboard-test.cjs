'use strict';
// One-time real end-to-end test. Bounded to 2 search requests, 1 candidate, 1 keyword.
// Does not publish, approve, create drafts, or schedule recurring jobs.
const fs=require('node:fs'),engine=require('../src/lib/provider-search.cjs');
const base='https://free-llm-api-1-didl.onrender.com';
const report={at:new Date().toISOString(),mode:'live_limited_dashboard_readback',steps:[],result:'not_started'};
const log=(name,status,details={})=>{report.steps.push({name,status,...details});console.log('E2E_CHECK',JSON.stringify(report.steps.at(-1)))};
async function api(path,opts={}){
 const response=await fetch(base+path,{...opts,headers:{'x-admin-secret':process.env.CRON_SECRET,'content-type':'application/json',...(opts.headers||{})},signal:AbortSignal.timeout(15000)});
 let body=null;try{body=await response.json()}catch{}
 return{status:response.status,ok:response.ok,body};
}
async function go(){
 if(!process.env.CRON_SECRET){log('auth','blocked',{reason:'CRON_SECRET not provided'});report.result='blocked';return}
 const health=await fetch(base+'/api/health',{signal:AbortSignal.timeout(18000)});
 const details=await health.json();
 if(!health.ok||details.storage!=='supabase'){log('storage','blocked',{http_status:health.status,storage:details.storage||'unknown'});report.result='blocked';return}
 log('storage','passed',{storage:'supabase'});
 const before=await Promise.all([api('/api/admin/market/competitors'),api('/api/admin/market/keywords')]);
 if(!before.every(x=>x.ok&&typeof x.body==='object')){log('dashboard_auth','blocked',{http_statuses:before.map(x=>x.status)});report.result='blocked';return}
 const previousCompetitors=before[0].body.competitors||[],previousKeywords=before[1].body.keywords||[];
 if(!Array.isArray(previousCompetitors)||!Array.isArray(previousKeywords)){log('dashboard_payload','blocked');report.result='blocked';return}
 log('dashboard_read_before','passed',{competitors:previousCompetitors.length,keywords:previousKeywords.length});
 const q='Saudi Arabia foreign investor company formation services';
 const research=await engine.search({queries:[{query:q,language:'en'}],maxCalls:2,maxResults:5});
 log('live_provider_search',research.results.length?'passed':'failed',{providers:research.diagnostics.map(x=>x.provider),candidates:research.results.length});
 const candidate=research.results.find(x=>/(company formation|business setup|company registration|incorporat|foreign investor)/i.test(x.title+' '+x.snippet)&&/(saudi|ksa|misa|السعود)/i.test(x.title+' '+x.snippet)&&!/(wikipedia|unicorn|news|magazine|media)/i.test(x.domain));
 let keyword=null;
 try{
  const response=await fetch('https://suggestqueries.google.com/complete/search?client=firefox&hl=ar&q='+encodeURIComponent('تأسيس شركة في السعودية للأجانب'),{signal:AbortSignal.timeout(6000)});
  const json=response.ok?await response.json():null;
  keyword=Array.isArray(json?.[1])?json[1].find(x=>typeof x==='string'&&x.trim().length>=12)?.trim():null;
  log('google_suggest',keyword?'passed':'empty',{http_status:response.status,has_keyword:!!keyword});
 }catch(e){log('google_suggest','unavailable',{error_type:e?.name||'error'})}
 if(!candidate&&!keyword){report.result='blocked';return}
 if(candidate&&!previousCompetitors.some(x=>x.domain===candidate.domain)){
  const c={name:candidate.title.slice(0,140),domain:candidate.domain,languages:['en'],source:'search',
   market:'saudi-company-formation',notes:'UNVERIFIED LIVE SEARCH CANDIDATE - human review required. Provider: '+candidate.source+'; Evidence URL: '+candidate.url};
  const saved=await api('/api/admin/market/competitors',{method:'POST',body:JSON.stringify(c)});
  log('save_competitor',saved.ok?'passed':'failed',{http_status:saved.status,domain:candidate.domain,server_error:String(saved.body?.message||saved.body?.error||saved.body?.status||'unknown').slice(0,220)});
  if(!saved.ok){report.result='failed';return}
 }
 if(keyword&&!previousKeywords.some(x=>x.term===keyword&&x.language==='ar')){
  const saved=await api('/api/admin/market/keywords',{method:'POST',body:JSON.stringify({
   term:keyword,language:'ar',source:'google-suggest',volume_confidence:'unknown'})});
  log('save_keyword',saved.ok?'passed':'failed',{http_status:saved.status});
  if(!saved.ok){report.result='failed';return}
 }
 const after=await Promise.all([api('/api/admin/market/competitors'),api('/api/admin/market/keywords')]);
 const hasCompetitor=!candidate||(after[0].ok&&after[0].body?.competitors?.some(x=>x.domain===candidate.domain));
 const hasKeyword=!keyword||(after[1].ok&&after[1].body?.keywords?.some(x=>x.term===keyword&&x.language==='ar'));
 report.readback={competitor_found:!!candidate&&hasCompetitor,keyword_found:!!keyword&&hasKeyword,
  competitors_total:after[0].body?.competitors?.length||0,keywords_total:after[1].body?.keywords?.length||0,
  domain:candidate?.domain||null,keyword:keyword||null};
 report.result=hasCompetitor&&hasKeyword?'success':'failed';
 log('dashboard_readback',report.result,report.readback);
}
go().catch(e=>{log('unexpected','failed',{error:e?.name||'error'});report.result='failed'}).finally(()=>{
 fs.mkdirSync('.geo-persistence-test',{recursive:true});
 fs.writeFileSync('.geo-persistence-test/report.json',JSON.stringify(report,null,2));
 console.log('GEO_PERSISTENCE_E2E',JSON.stringify(report));
 if(report.result!=='success')process.exitCode=1;
});
