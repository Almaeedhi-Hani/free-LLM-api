'use strict';
/**
 * API acceptance smoke against a local, secret-free Next.js fixture.
 * Never point this at production: it checks permission gates and rejects invalid writes.
 * Real database persistence is verified separately using read-only Supabase queries.
 */
const assert=require('node:assert/strict');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3100';
if(!/^http:\/\/127\.0\.0\.1:3100\/?$/.test(base)){
  console.error('Refusing non-local acceptance target');
  process.exit(2);
}
const admin=process.env.E2E_ADMIN_SECRET;
const geo=process.env.E2E_GEO_KEY;
if(!admin||!geo)throw Error('Missing ephemeral test-only credentials');
const request=async(path,options={})=>{
 const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(18000),...options});
 const body=await response.text();
 let json;try{json=JSON.parse(body)}catch{json=null}
 return {status:response.status,json,body};
};
const test=async(name,handler)=>{
 await handler();
 console.log('PASS '+name);
};
(async()=>{
 await test('Local health uses test storage, not production Supabase',async()=>{
  const a=await request('/api/health');
  assert.equal(a.status,200,JSON.stringify(a.json));
  assert.equal(a.json?.status,'ok');
  assert.equal(a.json?.storage,'file');
  assert.equal(a.json?.supabaseConfigured,false);
 });
 const guards=[
  ['/api/admin/content',{}],
  ['/api/admin/market/keywords',{}],
  ['/api/admin/market/competitors',{}],
  ['/api/admin/gsc-history',{}],
  ['/api/admin/visibility?type=queries',{}],
  ['/api/admin/package-requests',{}],
  ['/api/geo/data',{}],
  ['/api/cron-market',{}],
  ['/api/cron-gsc',{}],
  ['/api/geo/results',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}],
  ['/api/admin/editorial-sources',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}],
 ];
 await test('All privileged admin/GEO/cron endpoints reject missing credentials',async()=>{
  for(const [path,opts] of guards){
   const a=await request(path,opts);
   assert.equal(a.status,401,path+' expected 401, got '+a.status+' '+a.body.slice(0,120));
  }
 });
 await test('Valid admin auth reads isolated content and empty market fixtures',async()=>{
  const headers={'x-admin-secret':admin};
  const content=await request('/api/admin/content',{headers});
  assert.equal(content.status,200,content.body.slice(0,150));
  assert(Array.isArray(content.json?.faqs));
  const ks=await request('/api/admin/market/keywords',{headers});
  assert.equal(ks.status,200,ks.body.slice(0,150));
  assert(Array.isArray(ks.json?.keywords));
  const cs=await request('/api/admin/market/competitors',{headers});
  assert.equal(cs.status,200,cs.body.slice(0,150));
  assert(Array.isArray(cs.json?.competitors));
 });
 await test('Government-source search rejects bad input before external fetch',async()=>{
  const a=await request('/api/admin/editorial-sources',{
   method:'POST',headers:{'x-admin-secret':admin,'content-type':'application/json'},
   body:JSON.stringify({title:'bad',lang:'ar',target:'misa-license'})
  });
  assert.equal(a.status,400,a.body.slice(0,150));
 });
 await test('GEO endpoints cannot report successful persistence without storage',async()=>{
  const valid={'x-geo-api-key':geo};
  const a=await request('/api/geo/data',{headers:valid});
  assert.equal(a.status,503,a.body.slice(0,150));
  const b=await request('/api/geo/results',{method:'POST',headers:{...valid,'content-type':'application/json'},body:'{}'});
  assert.equal(b.status,503,b.body.slice(0,150));
 });
 await test('Invalid lead submission is rejected without creating a lead',async()=>{
  const a=await request('/api/package-requests',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(a.status,400,a.body.slice(0,150));
 });
 await test('LLM-facing public route exists and has text content',async()=>{
  const a=await request('/api/llm-version');
  assert.equal(a.status,200,a.body.slice(0,150));
  assert(a.body.length>300);
 });
 console.log('PASS isolated end-to-end API guard and read-only acceptance suite');
})().catch(e=>{console.error('SYSTEM_ACCEPTANCE_FAILED',e.stack||e.message);process.exitCode=1});
