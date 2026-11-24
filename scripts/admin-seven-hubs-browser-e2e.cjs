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
  // Check the real protected data endpoint and then exercise downloads with a representative fixture.
  const denied=await page.request.get(base+'/api/admin/dashboard-export');
  assert.equal(denied.status(),401);
  const actual=await page.request.get(base+'/api/admin/dashboard-export',{headers:{'x-admin-secret':secret}});
  assert.equal(actual.status(),200);
  const live=await actual.json();
  assert(Array.isArray(live.competitors)&&Array.isArray(live.runs)&&Array.isArray(live.links));
  assert(live.competitors.every(v=>!('id' in v)&&!('first_seen_at' in v)&&!('notes' in v)));
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  assert(live.opportunities.every(v=>Array.isArray(v.related_keywords)&&v.related_keywords.every(k=>!uuid.test(k))),'Export resolves keyword IDs');
  assert(live.goals.every(v=>!/^OpenCode candidate\s*;/i.test(v.description||'')),'Export removes technical placeholder');
  const sample={generatedAt:'2026-11-24T10:00:00Z',
   competitors:Array.from({length:125},(_,i)=>({name:'منافس '+i,domain:'competitor'+i+'.example'})),
   keywords:[{term:'تأسيس الشركات',language:'ar',search_volume:0}],
   opportunities:[{title:'فرصة اختبار',type:'keyword_gap',priority:'high',related_keywords:['استثمار']}],
   goals:[{title:'هدف اختبار',description:'وصف إداري',status:'open'}],
   runs:[{started_at:'2026-11-24T09:00:00Z',run_type:'radar',status:'success',summary:{competitors_discovered:2,competitor_domains_discovered:['named-run-competitor.example','second-run-competitor.example'],keyword_terms_analyzed:['كلمة من دورة التحليل'],opportunities_created:0,goals_created:0}},{started_at:'2026-11-23T09:00:00Z',run_type:'full',status:'success',summary:{keywords_analyzed:2}}],
   drafts:[{q:'مسودة سؤال',status:'pending'}],editorialDrafts:[],faqs:[{q:'سؤال اختبار',a:'إجابة اختبار'}],
   links:[{title:'صفحة منشورة',language:'ar',path:'/insights/test'}],siteKeywords:[]};
  await page.route('**/api/admin/dashboard-export',route=>route.fulfill({json:sample}));
  await page.setViewportSize({width:390,height:844});
  const fs=require('node:fs/promises');
  for(const [option,ext] of [['PDF','pdf'],['Excel','xlsx']]){
   await page.getByRole('button',{name:/تحميل التقرير/}).click();
   const event=page.waitForEvent('download',{timeout:30000});
   await page.getByRole('button',{name:option,exact:true}).click();
   const file=await event;
   assert(file.suggestedFilename().endsWith('.'+ext),'Actual file extension');
   const data=await fs.readFile(await file.path());
   assert(data.length>1000,'File must contain exported data');
   if(ext==='pdf'){
    assert.equal(data.subarray(0,5).toString(),'%PDF-');
    const content=data.toString('latin1');
    assert(content.includes('/S /URI')&&content.includes('competitor124.example'),'PDF includes final competitor link');
    const count=Number(content.match(new RegExp('/Type /Pages /Count ([0-9]+)'))?.[1]);
    assert(count>0&&count<20,'Compact PDF page count: '+count);
   }else{
    assert.equal(data.readUInt32LE(0),0x04034b50);
    assert(data.includes(Buffer.from('competitor124.example')),'Excel includes final competitor link');
    assert(data.includes(Buffer.from('المسودات المعلقة')),'Arabic sheet names');
    assert(!data.includes(Buffer.from('first_seen_at')),'No technical fields in workbook');
    for(const expected of ['named-run-competitor.example','كلمة من دورة التحليل','لم تُنشأ فرص أو أهداف جديدة','لم تُحفظ أسماء النتائج في السجل','وصف إداري','استثمار'])assert(data.includes(Buffer.from(expected)),'Readable workbook value: '+expected);
    assert(!data.includes(Buffer.from('منافسون مكتشفون: 2')),'Do not export count-only run results');
   }
   assert.equal(page.context().pages().length,1,'Download must not open another tab');
   console.log('PASS real downloadable report',ext,data.length);
  }
  await page.unroute('**/api/admin/dashboard-export');
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
