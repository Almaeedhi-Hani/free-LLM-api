'use strict';

// Read-only live smoke checks. All requests use GET. Never pass keys, cookies,
// personal data or mutable URLs. A failure is reported as a failed CI job.
const assert=require('node:assert/strict');

const base='https://free-llm-api-1-didl.onrender.com';
const checks=[];
const retryStatuses=new Set([502,503,504]);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(path,{expected=200,retries=2}={}){
  if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//'))throw Error('Invalid path');
  const url=base+path;
  let response,lastError;
  for(let attempt=0;attempt<=retries;attempt++){
    try{
      response=await fetch(url,{
        method:'GET',
        redirect:'follow',
        signal:AbortSignal.timeout(20000),
        headers:{'Accept':'*/*','User-Agent':'InvestInSaudi-ReadOnly-CI-Smoke/1.0'},
        cache:'no-store'
      });
      if(new URL(response.url).origin!==base)throw Error('Unexpected cross-origin redirect: '+path);
      if(response.status===expected)break;
      if(attempt<retries&&retryStatuses.has(response.status)){await delay(1000*(attempt+1));continue;}
      break;
    }catch(error){
      lastError=error;
      if(attempt===retries)throw Error('GET '+path+' failed: '+String(error?.message||error).slice(0,170));
      await delay(1000*(attempt+1));
    }
  }
  assert(response,'No HTTP response for '+path);
  assert.equal(response.status,expected,'GET '+path+' unexpected HTTP status'+(lastError?' after retry':''));
  const body=await response.text();
  checks.push({path,status:response.status,bytes:body.length});
  console.log('PASS GET '+path+' => '+response.status);
  return {response,body};
}

(async()=>{
  const {body:healthBody,response:healthResponse}=await get('/api/health');
  const health=JSON.parse(healthBody);
  assert.equal(health.status,'ok','Production health reports unavailable dependencies');
  assert.equal(health.storage,'supabase','Production should persist to Supabase rather than temporary files');
  assert.equal(health.supabaseConfigured,true);
  assert(Number.isInteger(health.draftCount)&&health.draftCount>=0,'Invalid draft count');
  assert(/application\/json/i.test(healthResponse.headers.get('content-type')||''));

  const {body:robots}=await get('/robots.txt');
  assert(/User-agent:\s*\*/i.test(robots),'Missing general robot rules');
  assert(/Disallow:\s*\/admin\//i.test(robots),'Admin route not excluded');
  assert(/Disallow:\s*\/api\/geo\//i.test(robots),'GEO ingestion route should not be crawlable');
  assert(/Sitemap:\s*https:\/\/free-llm-api-1-didl\.onrender\.com\/sitemap\.xml/i.test(robots));

  const {body:sitemap}=await get('/sitemap.xml');
  for(const path of ['/','/en','/zh','/packages','/en/packages','/zh/packages']){
    const loc=base+path;
    assert(sitemap.includes('<loc>'+loc+'</loc>'),'Missing sitemap URL '+loc);
  }
  assert((sitemap.match(/<loc>/g)||[]).length>=24,'Missing multilingual pages from sitemap');
  for(const key of ['hreflang="ar"','hreflang="en"','hreflang="zh-Hans"'])
    assert(sitemap.includes(key),'Sitemap missing alternate '+key);

  const {body:llm,response:llmResponse}=await get('/api/llm-version');
  assert(/text\/plain/i.test(llmResponse.headers.get('content-type')||''));
  assert(llm.includes('independent private service provider'),'Machine-readable feed must distinguish commercial and government roles');
  assert(llm.includes('Company formation packages in Arabic / English / Chinese'));
  for(const lang of ['### ar:','### en:','### zh:'])assert(llm.includes(lang),'Missing '+lang+' LLM description');
  assert(llm.includes('Human-reviewed editorial improvements'));
  assert(!llm.includes('STORAGE_TEST_2026'),'Test data leaked to public feed');

  // Public pages only; headers and content are not logged to prevent accidental PII.
  for(const lang of ['','/en','/zh']){
    const {body:html}=await get(lang||'/');
    assert(/<html[^>]+lang="/i.test(html),'Missing locale markup '+lang);
    assert(/<link rel="canonical" href=/i.test(html),'Missing canonical '+lang);
    assert(/application\/ld\+json/i.test(html),'Missing structured data '+lang);
  }

  const {body:admin}=await get('/admin/dashboard');
  assert(/name="robots"\s+content="noindex, nofollow"/i.test(admin),'Admin page must be noindexed');

  // These are GET-only authentication checks. No mutations are attempted.
  for(const path of [
    '/api/admin/content',
    '/api/admin/market/competitors',
    '/api/admin/package-requests',
    '/api/admin/visibility?type=technical'
  ]){
    await get(path,{expected:401,retries:0});
  }
  // These ingestion routes must not offer an unauthenticated GET readout.
  await get('/api/geo/results',{expected:405,retries:0});
  await get('/api/geo/discovery',{expected:405,retries:0});

  console.log('PASS '+checks.length+' read-only live HTTP checks: Supabase health, sitemap, robots, public locales, LLM feed, admin noindex, unauthorized admin endpoints, GEO method restrictions');
})().catch(error=>{
  console.error('LIVE_PUBLIC_SMOKE_FAILED '+String(error?.message||error));
  process.exitCode=1;
});
