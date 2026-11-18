'use strict';
/** Read-only production validation: GET only; no credentials, no mutations. */
const assert=require('node:assert/strict');
const base=(process.env.PRODUCTION_BASE_URL||'https://free-llm-api-1-didl.onrender.com').replace(/\/$/,'');
const expected=process.env.EXPECTED_DEPLOY_SHA||'';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function read(path){
 const response=await fetch(base+path,{method:'GET',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000)});
 return {status:response.status,text:await response.text()};
}
async function ready(){
 const attempts=expected?48:7;
 for(let i=0;i<attempts;i++){
  try{
   const result=await read('/api/health');
   if(result.status===200){
    const data=JSON.parse(result.text);
    if(data.status==='ok'&&data.storage==='supabase'&&(!expected||data.revision===expected))return data;
   }
  }catch(e){if(i===attempts-1)throw e}
  await sleep(15000);
 }
 throw Error('Render has not exposed healthy Supabase storage and the expected deployed commit');
}
(async()=>{
 const health=await ready();
 assert.equal(health.supabaseConfigured,true,'Live storage is Supabase');
 const protectedAdmin=[
  '/api/admin/content','/api/admin/content-impact','/api/admin/impact-experiments',
  '/api/admin/impact-ai','/api/admin/package-requests','/api/admin/geo-engine',
  '/api/admin/geo-publication','/api/admin/gsc-history',
  '/api/admin/market/competitors','/api/admin/market/keywords',
  '/api/admin/market/opportunities','/api/admin/market/goals',
  '/api/admin/market/runs','/api/admin/technical-tasks'
 ];
 for(const path of protectedAdmin){
  const response=await read(path);
  assert.equal(response.status,401,path+' must deny anonymous GET');
 }
 for(const path of ['/api/cron-gsc','/api/geo/data']){
  const response=await read(path);
  assert.equal(response.status,401,path+' must deny anonymous GET');
 }
 const robots=await read('/robots.txt');
 assert.equal(robots.status,200,'robots');
 assert(/Disallow:\s*\/admin\//i.test(robots.text),'admin robots exclusion');
 const sitemap=await read('/sitemap.xml');
 assert.equal(sitemap.status,200,'sitemap');
 assert(sitemap.text.includes('<loc>'),'real indexed sitemap entries');
 const feed=await read('/api/llm-version');
 assert.equal(feed.status,200,'public LLM feed');
 const admin=await read('/admin/dashboard');
 assert.equal(admin.status,200,'admin screen');
 assert(/noindex,\s*nofollow/.test(admin.text),'noindex admin');
 console.log('PASS production HTTP: Render revision, Supabase, 16 protected GETs, indexing and admin');
})().catch(e=>{console.error(e);process.exitCode=1});
