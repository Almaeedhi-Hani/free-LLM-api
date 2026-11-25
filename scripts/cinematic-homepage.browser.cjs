'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.CINEMATIC_TEST_BASE_URL||'http://127.0.0.1:3000';
const origin=new URL(base).origin;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'fixture only; never use production');
const output='cinematic-screenshots';
fs.mkdirSync(output,{recursive:true});
const locales=[
  {id:'ar',path:'/',locale:'ar-SA',html:'ar',dir:'rtl',reject:'رفض الاختيارية',packages:'/packages'},
  {id:'en',path:'/en',locale:'en-US',html:'en',dir:'ltr',reject:'Reject optional',packages:'/en/packages'},
  {id:'zh',path:'/zh',locale:'zh-CN',html:'zh-Hans',dir:'ltr',reject:'拒绝可选项',packages:'/zh/packages'}
];
const viewports=[{width:320,height:640},{width:390,height:844},{width:768,height:1024},{width:1440,height:900},{width:1920,height:1080}];
(async()=>{
  const browser=await chromium.launch({headless:true});
  const results=[];
  try {
    for(const lang of locales)for(const viewport of viewports){
      const context=await browser.newContext({viewport,locale:lang.locale,reducedMotion:'reduce',deviceScaleFactor:1});
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());
        return url.origin===origin?route.continue():route.abort();
      });
      const page=await context.newPage();
      const name=lang.id+'-'+viewport.width;
      try {
        const response=await page.goto(base+lang.path,{waitUntil:'domcontentloaded',timeout:90000});
        assert.equal(response.status(),200,name);
        await page.locator('.cinematic-hero').waitFor();
        await page.evaluate(()=>document.fonts.ready);
        await page.locator('.cinematic-art img').evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw Error('Local licensed poster did not load');});
        assert(await page.locator('.cinematic-art img').evaluate(img=>new URL(img.currentSrc).origin===location.origin),'same-origin media');
        const reject=page.getByRole('button',{name:lang.reject,exact:true});
        await reject.click({timeout:30000});
        await page.locator('[role="dialog"][aria-labelledby="cookie-title"]').waitFor({state:'hidden'});
        assert.equal(await page.locator('html').getAttribute('lang'),lang.html,name);
        assert.equal(await page.locator('html').getAttribute('dir'),lang.dir,name);
        assert.equal(await page.locator('h1').count(),1,name);
        assert.equal(await page.locator('.cinematic-secondary').getAttribute('href'),lang.packages,name);
        assert.equal(await page.locator('.cinematic-primary').getAttribute('href'),'#contact',name);
        assert.equal(await page.locator('#contact').count(),1,name);
        assert.equal(await page.locator('#services').count(),1,name);
        const geometry=await page.evaluate(()=>{
          const hero=document.querySelector('.cinematic-hero');
          const title=hero.querySelector('h1');
          const cta=hero.querySelector('.cinematic-primary');
          const secondary=hero.querySelector('.cinematic-secondary');
          const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
          return {viewport:innerWidth,hero:rect(hero),title:rect(title),cta:rect(cta),secondary:rect(secondary),heroScroll:hero.scrollWidth,heroClient:hero.clientWidth,documentScroll:document.documentElement.scrollWidth,header:rect(document.querySelector('.site-header')),transition:getComputedStyle(cta).transitionDuration};
        });
        if(viewport.width===390||viewport.width===1440){
          await page.screenshot({path:path.join(output,name+'-hero.png'),animations:'disabled'});
          await page.screenshot({path:path.join(output,name+'-full.png'),fullPage:true,animations:'disabled'});
        }
        assert(geometry.heroScroll<=geometry.heroClient+1,name+' hero horizontal overflow');
        assert(geometry.documentScroll<=geometry.viewport+1,name+' page horizontal overflow');
        for(const rect of [geometry.title,geometry.cta,geometry.secondary])assert(rect.left>=-1&&rect.right<=viewport.width+1,name+' clipped content');
        assert(geometry.cta.height>=44&&geometry.secondary.height>=44,name+' CTA target size');
        assert(geometry.title.top>=geometry.header.bottom-1,name+' heading obscured by navigation');
        assert.equal(geometry.transition,'0s',name+' reduced motion');
        const overlap=await page.evaluate(()=>{
          const floating=[...document.querySelectorAll('button[aria-controls]')].find(el=>el.classList.contains('bg-[#202a36]'));
          if(!floating)return [];
          const a=floating.getBoundingClientRect();
          return [...document.querySelectorAll('.cinematic-discover,.cinematic-tagline,.cinematic-actions a')].filter(el=>{
            const b=el.getBoundingClientRect();
            return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
          }).map(el=>el.className);
        });
        assert.deepEqual(overlap,[],name+' floating WhatsApp must not obscure hero links or tagline');
        if(viewport.width===390||viewport.width===1440){
          await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
          const axe=await page.evaluate(async()=>await window.axe.run('.cinematic-hero',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
          const violations=axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
          results.push({name,geometry,violations,incomplete:axe.incomplete.map(v=>v.id)});
          assert(!violations.some(v=>['critical','serious'].includes(v.impact)),name+' serious hero accessibility violations');
        }else results.push({name,geometry});
        if(viewport.width<=760){
          const toggle=page.locator('.mobile-floating-menu-toggle');
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'),'true',name);
          assert(await page.locator('.mobile-floating-menu').isVisible(),name);
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'),'false',name);
        }
        await page.locator('.cinematic-primary').click();
        assert.equal(new URL(page.url()).hash,'#contact',name+' consultation route');
        console.log('PASS',name);
      }finally{await context.close();}
    }
  }finally{
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1});
