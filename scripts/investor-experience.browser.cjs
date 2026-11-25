'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.CINEMATIC_TEST_BASE_URL||'http://127.0.0.1:3000';
const origin=new URL(base).origin;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const slugs=['misa-license','company-formation','corporate-banking','contract-drafting','premium-residency','investment-funds'];
const langs=[{id:'ar',locale:'ar-SA',reject:'رفض الاختيارية',accept:'قبول الكل'},{id:'en',locale:'en-US',reject:'Reject optional',accept:'Accept all'},{id:'zh',locale:'zh-CN',reject:'拒绝可选项',accept:'全部接受'}];
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 try{
 for(const lang of langs)for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:lang.locale,reducedMotion:'reduce'});
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await ctx.newPage(),prefix=lang.id==='ar'?'':'/'+lang.id;
  try{
   for(const slug of slugs){
    const route=prefix+'/services/'+slug;
    const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:90000});assert.equal(response.status(),200,route);
    const reject=page.getByRole('button',{name:lang.reject,exact:true});if(await reject.isVisible()){
     const dialog=page.getByRole('dialog',{name:lang.id==='ar'?'خصوصيتك تهمنا':lang.id==='en'?'Your privacy matters':'您的隐私很重要'});
     assert.equal(await dialog.getByRole('button').count(),2);
     assert.equal(await dialog.locator('input').count(),0);
     await reject.click();
     const rejectedCookie=(await ctx.cookies()).find(c=>c.name==='site-cookie-consent');
     const choice=JSON.parse(decodeURIComponent(rejectedCookie.value));
     assert.equal(choice.analytics,false);assert.equal(choice.marketing,false);assert.equal(choice.preferences,false);
    }
    assert.equal(await page.locator('h1').count(),1);
    const hero=page.locator(slug==='premium-residency'?'#main article > header':'#main .investor-service-hero');
    await hero.waitFor();
    assert(await hero.locator('a.action-primary').count(),route+' consultation action');
    const dims=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,nav:performance.getEntriesByType('navigation').map(n=>({ttfb:n.responseStart-n.requestStart,domContentLoaded:n.domContentLoadedEventEnd,transferSize:n.transferSize}))[0]}));
    assert(dims.scroll<=width+1,route+' horizontal overflow '+JSON.stringify(dims));
    assert.equal(await page.locator('.investor-footer-intro').count(),1);
    if(slug!=='premium-residency'){
     assert(await page.locator('.investor-preparation-list .detail-step').count(),route+' preparation');
     const link=page.locator('.investor-next-actions .discovery-compact');
     const href=await link.getAttribute('href');
     assert.equal(new URL(href,origin).searchParams.get('from'),route);
    }
    if(slug==='company-formation'||slug==='premium-residency')await page.screenshot({path:'cinematic-screenshots/'+lang.id+'-'+width+'-experience-'+slug+'.png',fullPage:true,animations:'disabled'});
    results.push({route,width,...dims});
   }
   const data={event:'page_view',page:'home',locale:lang.id};
   const headers={origin,'Content-Type':'application/json'};
   const rejected=await ctx.request.post(base+'/api/investor-events',{headers,data});assert.equal(rejected.status(),403);
   await page.locator('.investor-cookie-settings').click();
   const pageView=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/investor-events'&&r.request().method()==='POST'&&r.request().postDataJSON()?.event==='page_view');
   await page.getByRole('button',{name:lang.accept,exact:true}).click();
   await page.locator('[aria-labelledby="cookie-title"]').waitFor({state:'hidden'});
   const cookie=(await ctx.cookies()).find(c=>c.name==='site-cookie-consent');
   assert(cookie,'consent cookie was saved');
   const saved=JSON.parse(decodeURIComponent(cookie.value));
   assert.equal(saved.analytics,true,'explicit analytics opt-in recorded');
   assert.equal(saved.preferences,true,'optional language persistence consent recorded');
   const automatic=await pageView;
   assert.equal(automatic.status(),204,'real browser analytics accepted after opt-in');
   assert.deepEqual(Object.keys(automatic.request().postDataJSON()).sort(),['event','locale','page']);
   const consent=await ctx.request.post(base+'/api/investor-events',{headers,data});assert.equal(consent.status(),204,'fixture configured origin and consent accepted');
   assert.equal((await ctx.request.post(base+'/api/investor-events',{headers,data:{...data,phone:'fake'}})).status(),400);
   assert.equal((await ctx.request.post(base+'/api/investor-events',{headers:{...headers,origin:'https://example.invalid'},data})).status(),403);
   await page.locator('.investor-cookie-settings').click();await page.getByRole('button',{name:lang.reject,exact:true}).click();
   assert.equal((await ctx.request.post(base+'/api/investor-events',{headers,data})).status(),403);
   const denied=JSON.parse(decodeURIComponent((await ctx.cookies()).find(c=>c.name==='site-cookie-consent').value));
   assert.equal(denied.analytics,false);assert.equal(denied.marketing,false);assert.equal(denied.preferences,false);
   assert(!(await ctx.cookies()).some(c=>c.name==='site-language'));
   console.log('PASS investor experience and consent',lang.id,width);
  }finally{await ctx.close()}
 }
 }finally{fs.writeFileSync('cinematic-screenshots/investor-experience-results.json',JSON.stringify(results,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
