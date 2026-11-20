'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:3100';
const secret=process.env.E2E_ADMIN_SECRET;
(async()=>{
 assert(secret,'Isolated admin fixture secret is required');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:375,height:812}});
 try{
  await page.goto(base+'/admin/dashboard',{waitUntil:'domcontentloaded'});
  const unauthorized=await page.evaluate(()=>fetch('/api/admin/geo-publication').then(r=>r.status));
  assert.equal(unauthorized,401,'Publication history must reject unauthenticated callers');
  await page.getByPlaceholder('المفتاح السري').fill(secret);
  await page.getByRole('button',{name:'دخول لوحة التحكم'}).click();
  await page.locator('aside nav').waitFor({timeout:30000});
  const navigate=async(group,item)=>{
   await page.getByRole('button',{name:'فتح القائمة'}).click();
   await page.locator('aside nav > div > button').filter({hasText:group}).first().click();
   await page.locator('aside nav > div > div > button').filter({hasText:item}).first().click();
   await page.locator('header h1').filter({hasText:item}).first().waitFor();
   assert((await page.locator('aside').getAttribute('class')).includes('translate-x-full'),'Mobile menu closes after navigation');
  };
  await navigate('التشغيل والإعدادات','الإعدادات');
  const archive=page.locator('#admin-legacy-archive');
  assert.equal(await archive.count(),1,'Exactly one archive in settings');
  assert.equal(await archive.getAttribute('open'),null,'Archive starts folded');
  await archive.locator('summary').click();
  assert.notEqual(await archive.getAttribute('open'),null,'Archive disclosure opens on click');
  assert.equal(await archive.locator('article').count(),6,'Six recorded historical UI tools');
  await navigate('المحتوى والنشر','المحتوى المنشور: الروابط');
  const published=page.locator('section[aria-label="المحتوى المنشور: الروابط"]');
  await published.waitFor();
  assert.equal(await published.getAttribute('dir'),'rtl','Published links screen stays RTL on phone');
  assert.equal(await published.locator('#unpublished-previews').getAttribute('open'),null,'Drafts stay folded');
  assert.equal(await published.locator('#unpublished-previews a[href]').count(),0,'Pending drafts have no clickable public URLs');
  await published.getByLabel('بحث في روابط المحتوى المنشور').fill('unlikely-long-nonmatch-123456');
  await published.getByText('لا توجد عناصر منشورة تطابق معايير البحث.').waitFor();
  await published.getByLabel('بحث في روابط المحتوى المنشور').fill('');
  await published.getByLabel('تصفية لغة الروابط المنشورة').selectOption('en');
  await published.getByLabel('تصفية لغة الروابط المنشورة').selectOption('all');
  await page.setViewportSize({width:1360,height:850});
  assert.equal(await page.locator('aside nav > div > button').count(),7,'No extra top-level hub');
  await page.getByRole('button',{name:'تسجيل الخروج'}).click();
  await page.getByPlaceholder('المفتاح السري').waitFor();
  console.log('PASS V3 archive and published-links real browser: auth, 7 hubs, RTL, phone, filters, closed drafts, logout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
