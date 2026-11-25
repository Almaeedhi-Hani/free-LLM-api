'use strict';
const assert=require('node:assert/strict');
const base=process.env.SEO_TEST_BASE_URL||'http://127.0.0.1:3000';
(async()=>{
 const read=async(path,opts={})=>{const r=await fetch(base+path,{redirect:'manual',...opts});assert.equal(r.status,200,path);assert.match(r.headers.get('content-type'),/text\/plain/);return {r,body:await r.text()}};
 const index=await read('/llms.txt');
 for(const p of ['/llms-full.txt','/llms/ar.txt','/llms/en.txt','/llms/zh.txt','/llms/services.txt','/llms/packages.txt','/llms/faq.txt','/llms/insights.txt','/llms/updates.txt','/llms/en/services/company-formation.md']){
  assert(index.body.includes(p),'index missing '+p);const x=await read(p);assert(x.body.includes('Independent private Saudi investor services')||x.body.includes('independent private service provider'));assert(!x.body.includes('STORAGE_TEST_'));
 }
 const old=await read('/api/llm-version'),full=await read('/llms-full.txt');assert.equal(old.body,full.body);
 const en=await read('/llms/en.txt');assert(en.body.length<full.body.length);assert(en.body.includes('## Language: en'));assert(!en.body.includes('## Language: zh'));
 const pkg=await read('/llms/packages.txt');assert(pkg.body.includes('Service fee: 27000 SAR'));assert(pkg.body.includes('Service fee: 77000 SAR'));
 const tag=en.r.headers.get('etag');assert(tag);const unchanged=await fetch(base+'/llms/en.txt',{headers:{'if-none-match':tag}});assert.equal(unchanged.status,304);
 const page=await fetch(base+'/en/services/company-formation',{redirect:'manual'});assert.equal(page.status,200);assert((page.headers.get('link')||'').includes('/llms.txt'));assert((await page.text()).includes('href="/llms.txt"'));
 for(const p of ['/llms/en/insights/does-not-exist.md','/llms/admin.txt','/llms/en/services/not-a-service.md'])assert.equal((await fetch(base+p)).status,404,p);
 assert.equal((await fetch(base+'/api/admin/ai-knowledge')).status,401);
 console.log('PASS live HTTP fixture: dynamic index, 10 feeds, localized Markdown, ETag, discovery, private route and missing content exclusion');
})().catch(e=>{console.error(e);process.exitCode=1});
