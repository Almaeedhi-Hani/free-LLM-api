'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:3100';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const size of [
   {width:1280,height:800,panelWidth:280,panelHeight:315},
   {width:320,height:568,panelWidth:280,panelHeight:315},
   {width:280,height:320,panelWidth:248,panelHeight:208}
  ]){
   const page=await browser.newPage({viewport:{width:size.width,height:size.height}});
   try{
    await page.goto(base+'/en',{waitUntil:'domcontentloaded',timeout:45000});
    const trigger=page.getByRole('button',{name:'WhatsApp consultation'});
    await trigger.waitFor({timeout:25000});
    // Wait for React hydration before interacting with the public floating control.
    await page.waitForTimeout(600);
    await trigger.click();
    const panel=page.locator('section[aria-label="Speak to our advisors"]');
    await panel.waitFor({timeout:10000});
    const box=await panel.evaluate(element=>{
     const bounds=element.getBoundingClientRect();
     const body=element.querySelector('div[tabindex="0"]');
     const header=element.querySelector('header');
     const footer=element.querySelector('p.border-t');
     if(!body||!header||!footer)throw Error('Expected fixed heading/footer and a scrollable advisor list');
     const area=body.getBoundingClientRect();
     return {
      width:bounds.width,height:bounds.height,left:bounds.left,top:bounds.top,
      right:bounds.right,bottom:bounds.bottom,
      overflowY:getComputedStyle(body).overflowY,
      bodyHeight:area.height,scrollHeight:body.scrollHeight,
      headerShrink:getComputedStyle(header).flexShrink,
      footerShrink:getComputedStyle(footer).flexShrink
     };
    });
    assert(Math.abs(box.width-size.panelWidth)<=1,JSON.stringify({size,box}));
    assert(Math.abs(box.height-size.panelHeight)<=1,JSON.stringify({size,box}));
    assert(box.left>=0&&box.top>=0&&box.right<=size.width&&box.bottom<=size.height,
     'Panel must fit actual viewport: '+JSON.stringify({size,box}));
    assert.equal(box.overflowY,'auto');
    assert.equal(box.headerShrink,'0');
    assert.equal(box.footerShrink,'0');
    assert(box.bodyHeight>0);
    assert.equal(await panel.locator('a[href^="https://wa.me/"]').count(),3,'All advisors remain accessible');
    if(size.height<=320){
     assert(box.scrollHeight>box.bodyHeight+5,'Small screen should allow internal scrolling');
     const scrolling=await panel.locator('div[tabindex="0"]').evaluate(element=>{
      element.scrollTop=element.scrollHeight;
      return {scrollTop:element.scrollTop,max:element.scrollHeight-element.clientHeight};
     });
     assert(scrolling.scrollTop>0&&scrolling.max>0,'Advisor list must scroll independently');
    }
    await page.keyboard.press('Escape');
    assert.equal(await panel.count(),0,'Keyboard Escape closes the menu');
    console.log('PASS_WHATSAPP_RESPONSIVE',size.width+'x'+size.height,box.width+'x'+box.height);
   }finally{await page.close();}
  }
 }catch(e){
  console.error('WHATSAPP_RESPONSIVE_BROWSER_FAIL',e?.message||e);
  process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('WHATSAPP_RESPONSIVE_BROWSER_FATAL',e.message);process.exitCode=1});
