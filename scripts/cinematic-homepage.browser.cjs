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
        const consultation=await page.locator('.cinematic-primary').getAttribute('href');
        assert.match(consultation,/^https:\/\/wa\.me\/[1-9]\d{7,14}$/,name+' valid locale WhatsApp URL');
        assert.equal(consultation,await page.locator('#contact .action-primary').getAttribute('href'),name+' same locale advisor');
        assert.equal(await page.locator('.cinematic-primary').getAttribute('target'),'_blank');
        assert.equal(await page.locator('.cinematic-primary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(184, 134, 11)',name+' gold CTA');
        assert.equal(await page.locator('.cinematic-primary').evaluate(e=>getComputedStyle(e).color),'rgb(17, 24, 39)');
        assert.notEqual(await page.locator('.cinematic-secondary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(184, 134, 11)',name+' neutral secondary');
        assert.equal(await page.locator('#contact').count(),1,name);
        assert.equal(await page.locator('#services').count(),1,name);
        const banner=page.locator('#formation-packages-banner');
        assert.equal(await banner.count(),1);
        const bannerLink=banner.locator('[data-formation-packages-cta]');
        assert.equal(await bannerLink.getAttribute('href'),lang.packages,name+' localized banner link');
        assert.equal(await bannerLink.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(184, 134, 11)');
        assert.equal(await banner.locator('[data-formation-category]').count(),3);
        assert.deepEqual(await banner.locator('[data-package-count]').evaluateAll(els=>els.map(e=>Number(e.dataset.packageCount)).sort((a,b)=>a-b)),[3,3,4]);
        const bounds=await banner.evaluate(e=>{
          const r=e.getBoundingClientRect();
          return {left:r.left,right:r.right,scroll:e.scrollWidth,width:e.clientWidth,
            cards:[...e.querySelectorAll('[data-formation-category]')].map(c=>({scroll:c.scrollWidth,width:c.clientWidth})),
            mesh:getComputedStyle(e.querySelector('[data-formation-packages-visual]'),'::before').backgroundImage};
        });
        assert(bounds.left>=-1&&bounds.right<=viewport.width+1&&bounds.scroll<=bounds.width+1,name+' banner overflow');
        assert(bounds.cards.every(c=>c.scroll<=c.width+1),name+' card text overflow');
        assert(bounds.mesh.includes('radial-gradient'),name+' mesh background');
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
          const menuActive=page.locator('.mobile-floating-menu-link.is-active');
          const menuColors=await menuActive.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,text:getComputedStyle(e).color,line:getComputedStyle(e,'::after').backgroundColor}));
          assert.deepEqual(menuColors,{bg:'rgb(32, 42, 54)',text:'rgb(255, 255, 255)',line:'rgb(184, 134, 11)'},name+' dark selected menu with gold underline');
          assert.equal(await page.locator('.mobile-floating-menu-cta').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(32, 42, 54)');
          if(viewport.width===390)await page.screenshot({path:path.join(output,name+'-menu.png'),animations:'disabled'});
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'),'false',name);
        }
        // Intercept the navigation locally: no real WhatsApp traffic or messages.
        await context.route(consultation,route=>route.fulfill({status:200,contentType:'text/plain',body:'WhatsApp fixture'}));
        const [popup]=await Promise.all([page.waitForEvent('popup'),page.locator('.cinematic-primary').click()]);
        await popup.waitForLoadState('domcontentloaded');
        assert.equal(popup.url(),consultation,name+' direct consultation route');
        await popup.close();
        if(viewport.width===390||viewport.width===1440){
          const serviceCards=page.locator('#services .service-card.discovery-card');
          assert.equal(await serviceCards.count(),6);
          assert.equal(await page.locator('.entry-route-card.discovery-card').count(),3);
          assert((await serviceCards.first().evaluate(e=>getComputedStyle(e).backgroundImage)).includes('radial-gradient'));
          assert(await serviceCards.first().locator('.discovery-arrow svg').count());
          await page.locator('#services .discovery-grid').screenshot({path:path.join(output,name+'-discovery-services.png'),animations:'disabled'});
          await banner.scrollIntoViewIfNeeded();
          await banner.screenshot({path:path.join(output,name+'-formation-banner.png'),animations:'disabled'});
          const bannerAxe=await page.evaluate(async()=>await window.axe.run('#formation-packages-banner',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
          assert(!bannerAxe.violations.some(v=>['critical','serious'].includes(v.impact)),name+' banner accessibility: '+JSON.stringify(bannerAxe.violations.map(v=>v.id)));
          await Promise.all([page.waitForURL(base+lang.packages),bannerLink.click()]);
          await page.waitForLoadState('networkidle');
          if(viewport.width===1440){
            const active=page.locator('.desktop-nav a[aria-current="page"]');
            await active.waitFor();
            assert.equal(await active.getAttribute('href'),lang.packages);
            assert((await active.evaluate(e=>getComputedStyle(e).boxShadow)).includes('184, 134, 11'));
          }
          const category=page.locator('.license-category-card').first();
          await category.waitFor();
          assert.equal(await category.locator('.discovery-arrow').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(32, 42, 54)');
          assert.equal(await category.locator('.discovery-number').evaluate(e=>getComputedStyle(e).color),'rgb(184, 134, 11)');
          assert.equal(await page.locator('.license-category-card.discovery-card').count(),3);
          assert((await category.evaluate(e=>getComputedStyle(e).backgroundImage)).includes('radial-gradient'));
          await page.locator('.license-category-grid').screenshot({path:path.join(output,name+'-discovery-categories.png'),animations:'disabled'});
          const selected=page.locator('.license-offer[aria-pressed="true"]');
          // Development SSR can display the button before React attaches handlers.
          // Wait for network idle above, then retry a lost pre-hydration click only
          // while the original category button remains present.
          for(let attempt=0;attempt<3;attempt++){
            if(await selected.count())break;
            await category.click();
            try{await selected.waitFor({state:'visible',timeout:2000});break;}catch(error){if(attempt===2)throw error;}
          }
          await page.mouse.move(0,0);
          const back=page.locator('.license-back');
          assert.equal(await back.locator('svg.package-arrow[data-direction="back"]').count(),1);
          assert(!/[↩↪🔙]/u.test(await back.innerText()),'no emoji return icon');
          const backTransform=await back.locator('svg').evaluate(e=>getComputedStyle(e).transform);
          assert.equal(backTransform,lang.id==='ar'?'none':'matrix(-1, 0, 0, -1, 0, 0)');
          await back.click();
          await category.waitFor();
          assert.equal(await category.locator('svg.package-arrow[data-direction="forward"]').count(),1);
          await category.click();
          await selected.waitFor();
          if(viewport.width===390)await page.screenshot({path:path.join(output,name+'-package-selection.png'),fullPage:true,animations:'disabled'});
          assert.equal(await selected.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(184, 134, 11)');
          assert.equal(await selected.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
          assert.equal(await selected.locator('.discovery-choice-marker').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(184, 134, 11)');
          assert.equal(await page.locator('.license-detail>button').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(184, 134, 11)');
          if(await page.locator('.license-offer[aria-pressed="false"]').count()){
            // Use a stable index: the previous aria-pressed=false locator
            // changed identity as soon as the selected state updated.
            const next=page.locator('.license-offer').nth(1);
            await next.click();
            await page.locator('.license-offer').nth(1).and(page.locator('[aria-pressed="true"]')).waitFor();
            assert.equal(await next.getAttribute('aria-pressed'),'true');
          }
          await page.locator('.license-detail>button').click();
          await page.locator('.package-form button[type="submit"]').waitFor();
          assert.equal(await page.locator('.package-form .package-secondary svg.package-arrow[data-direction="back"]').count(),1);
          assert.equal(await page.locator('.package-form button[type="submit"] svg.package-arrow[data-direction="forward"]').count(),1);
          await page.screenshot({path:path.join(output,name+'-package.png'),fullPage:true,animations:'disabled'});
          await page.goto(base+(lang.id==='ar'?'':'/'+lang.id)+'/services/company-formation',{waitUntil:'networkidle'});
          const related=page.locator('.service-related-grid .discovery-card');
          assert.equal(await related.count(),3);
          assert((await related.first().evaluate(e=>getComputedStyle(e).backgroundImage)).includes('radial-gradient'));
          await page.locator('.service-related-grid').screenshot({path:path.join(output,name+'-discovery-related.png'),animations:'disabled'});
          const target=await related.first().getAttribute('href');
          await Promise.all([page.waitForURL(base+target),related.first().click()]);
          await page.goto(base+(lang.id==='ar'?'':'/'+lang.id)+'/services/premium-residency',{waitUntil:'networkidle'});
          const assessment=page.locator('#assessment');
          await assessment.waitFor();
          assert.equal(await assessment.locator('select').count(),3);
          for(const select of await assessment.locator('select').all())assert.equal(await select.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(184, 134, 11)');
          assert.equal(await assessment.locator('button[type="submit"]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(184, 134, 11)');
          await assessment.locator('select').nth(0).selectOption('investor');
          await assessment.locator('select').nth(1).selectOption('inside');
          await assessment.locator('select').nth(2).selectOption('soon');
          await assessment.locator('button[type="submit"]').click();
          await assessment.locator('a.action-primary').waitFor();
          assert.equal(await assessment.locator('a.action-primary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(184, 134, 11)');
          await assessment.scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(output,name+'-residency.png'),fullPage:true,animations:'disabled'});
        }
        console.log('PASS',name);
      }finally{await context.close();}
    }
  }finally{
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1});
