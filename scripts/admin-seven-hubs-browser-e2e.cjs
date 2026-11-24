'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const secret=process.env.E2E_ADMIN_SECRET;
const base='http://127.0.0.1:3100';
const hubs=[
 {group:'الرئيسية',pages:['الرئيسية']},
 {group:'السوق والمنافسون',pages:['المنافسون','كلمات البحث السوقية','الأدلة ومصادر النتائج']},
 {group:'الفرص وخطة العمل',pages:['الفرص','الأهداف']},
 {group:'المحتوى والنشر',pages:['مركز المحتوى والأثر','تطوير جميع صفحات الموقع','اعتماد المسودات','محتوى الموقع']},
 {group:'القياس والظهور',pages:['SEO وظهور الذكاء الاصطناعي']},
 {group:'طلبات العملاء',pages:['طلبات الباقات']},
 {group:'التشغيل والإعدادات',pages:['وكيل GEO','سجل التشغيل','الإعدادات','التواصل','إدارة الكوكيز','SEO والتكاملات']}
];
(async()=>{
 if(!secret)throw Error('Missing isolated admin fixture secret');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:850}});
 try{
  await page.goto(base+'/admin/dashboard',{waitUntil:'domcontentloaded'});
  await page.getByPlaceholder('المفتاح السري').waitFor({timeout:30000});
  await page.getByPlaceholder('المفتاح السري').fill(secret);
  await page.getByRole('button',{name:'دخول لوحة التحكم'}).click();
  // Exercise the public consent dismissal instead of forcing clicks through
  // an overlapping cookie banner; this keeps the logout test realistic.
  const rejectCookies=page.getByRole('button',{name:'رفض الاختيارية'});
  if(await rejectCookies.isVisible())await rejectCookies.click();
  const groups=page.locator('aside nav > div > button');
  await groups.first().waitFor({timeout:30000});
  assert.equal(await groups.count(),7,'Exactly seven visible top-level groups');
  const seen=new Set();
  for(const group of hubs){
   await groups.filter({hasText:group.group}).first().click();
   for(const label of group.pages){
    if(group.pages.length>1){
      await page.locator('aside nav > div > div > button').filter({hasText:label}).first().click();
    }
    await page.locator('header h1').filter({hasText:label}).first().waitFor({timeout:15000});
    seen.add(label);
   }
   console.log('PASS_GROUP',group.group,group.pages.length);
  }
  assert.equal(seen.size,18,'All eighteen original subpages navigable');
  await page.setViewportSize({width:375,height:800});
  await page.getByRole('button',{name:'فتح القائمة'}).click();
  await page.locator('aside nav > div > button').filter({hasText:'السوق والمنافسون'}).first().click();
  await page.locator('aside nav > div > div > button').filter({hasText:'كلمات البحث السوقية'}).first().click();
  await page.locator('header h1').filter({hasText:'كلمات البحث السوقية'}).first().waitFor();
  assert((await page.locator('aside').getAttribute('class')).includes('translate-x-full'),
   'Mobile menu closes after subpage selection');
  await page.getByRole('button',{name:'فتح القائمة'}).click();
  await page.locator('aside nav > div > button').filter({hasText:'الرئيسية'}).first().click();
  await page.locator('header h1').filter({hasText:'الرئيسية'}).waitFor();
  for(const width of [320,375,390,430,1360]){
   await page.setViewportSize({width,height:800});
   const title=await page.locator('header h1').boundingBox();
   const refresh=await page.getByRole('button',{name:'تحديث البيانات',exact:true}).boundingBox();
   const report=page.getByRole('button',{name:/تحميل التقرير/});
   const button=await report.boundingBox();
   const sync=await page.getByTestId('dashboard-header-sync').boundingBox();
   assert(title&&refresh&&button&&sync,'Header controls and sync must be visible');
   assert(Math.abs(refresh.y-button.y)<2&&Math.abs(refresh.height-button.height)<2,'Actions must share row and height');
   assert(button.x<refresh.x&&refresh.x<title.x,'Report and refresh must sit left of title in RTL');
   assert(title.width>20&&title.y<refresh.y+refresh.height&&title.y+title.height>refresh.y,'Title stays visible in same row');
   assert(sync.y>=refresh.y+refresh.height,'Sync text must appear below actions');
   await report.click();
   for(const name of ['PDF','Excel']){
    const option=page.getByRole('button',{name,exact:true});
    await option.waitFor();
    const b=await option.boundingBox();
    assert(b&&b.x>=0&&b.x+b.width<=width+1,'Report option clipped at viewport '+width);
   }
   await report.click();
   console.log('PASS mobile header and unclipped report menu',width);
  }
  await page.setViewportSize({width:1360,height:850});
  await page.getByRole('button',{name:'تسجيل الخروج'}).click();
  await page.getByPlaceholder('المفتاح السري').waitFor();
  console.log('PASS seven hubs / all 18 editable pages / mobile submenu / admin logout');
 }catch(e){
  await page.screenshot({path:'/tmp/admin-seven-hubs-browser-failure.png',fullPage:true}).catch(()=>{});
  console.error('ADMIN_HUB_BROWSER_FAIL',e?.message||e);
  process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('ADMIN_HUB_BROWSER_FATAL',e.message);process.exitCode=1});
