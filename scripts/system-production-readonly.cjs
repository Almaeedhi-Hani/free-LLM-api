'use strict';
/**
 * Live production smoke: HTTP GET ONLY, fixed allowlisted routes, no credentials,
 * no POST/PATCH/DELETE, no stored PII, no GSC refresh or market-radar trigger.
 */
const assert=require('node:assert/strict');
const site='https://free-llm-api-1-didl.onrender.com';
const pages=['/','/en','/zh','/packages','/en/packages','/zh/packages'];
const probe=async(path,expect=200)=>{
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const res=await fetch(site+path,{method:'GET',cache:'no-store',headers:{'user-agent':'InvestInSaudi-ReadOnlyAcceptance/1.0','accept-language':'ar'},signal:AbortSignal.timeout(45000)});
   const body=await res.text();
   if(res.status===expect)return {body,headers:res.headers};
   last=Error(path+' HTTP '+res.status+' expected '+expect);
   if(![429,500,502,503,504].includes(res.status))break;
  }catch(e){last=e}
  if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2200));
 }
 throw last;
};
(async()=>{
 const health=await probe('/api/health');
 const data=JSON.parse(health.body);
 assert.equal(data.status,'ok','production health status');
 assert.equal(data.storage,'supabase','production uses durable database');
 assert.equal(data.supabaseConfigured,true,'production database credentials available');
 console.log('PASS production health returns durable Supabase storage');
 for(const p of pages){
  const {body}=await probe(p);
  assert(/<html/i.test(body),p+' should serve HTML');
  assert(/<title>/i.test(body),p+' requires a page title');
 }
 console.log('PASS six live AR/EN/ZH public home and package routes return HTML');
 const siteMap=await probe('/sitemap.xml');
 assert((siteMap.body.match(/<loc>/g)||[]).length===24,'Expected 24 canonical sitemap entries');
 console.log('PASS production sitemap has 24 entries');
 const robots=await probe('/robots.txt');
 assert(/Disallow:\s*\/admin\//i.test(robots.body));
 console.log('PASS production robots excludes admin');
 const llm=await probe('/api/llm-version');
 assert(llm.body.length>300,'Expected machine-readable service information');
 console.log('PASS public AI-readable content endpoint returns real content');
 const dashboard=await probe('/admin/dashboard');
 assert(/noindex/i.test(dashboard.body),'Admin must not be indexable');
 console.log('PASS production admin page responds with noindex');
 for(const p of ['/api/admin/content','/api/geo/data','/api/cron-gsc']){
  await probe(p,401);
 }
 console.log('PASS live admin, GEO and GSC endpoints deny unauthenticated GETs');
 console.log('PASS production read-only smoke (GET requests only; no production writes)');
})().catch(e=>{console.error('LIVE_READ_ONLY_ACCEPTANCE_FAILED',e?.stack||e);process.exitCode=1});
