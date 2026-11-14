'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:3100';
const secret=process.env.E2E_ADMIN_SECRET;
(async()=>{
 if(!secret)throw Error('missing ephemeral E2E admin secret');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('dialog',async dialog=>{await dialog.accept()});
 const go=async tab=>page.locator('aside nav button').filter({hasText:tab}).first().click();
 try{
  await page.goto(base+'/admin/dashboard',{waitUntil:'networkidle'});
  await page.waitForTimeout(850);
  const invalid=await page.request.get(base+'/api/admin/content',{headers:{'x-admin-secret':'incorrect-key'}});
  console.log('LOCAL_ADMIN_AUTH_NEGATIVE',invalid.status());
  await page.getByPlaceholder('المفتاح السري').fill('incorrect-key');
  await page.getByRole('button',{name:'فتح'}).click();
  await page.getByText('المفتاح السري غير صحيح').waitFor({timeout:12000}).catch(async e=>{console.error('LOGIN_DOM',JSON.stringify((await page.locator('body').innerText()).slice(0,550)));throw e});
  await page.getByPlaceholder('المفتاح السري').fill(secret);
  await page.getByRole('button',{name:'فتح'}).click();
  await page.getByRole('heading',{name:'الفقرة الذهبية'}).first().waitFor();
  console.log('PASS login blocks wrong key and accepts valid server-verified key');

  await go('التواصل');
  await page.getByPlaceholder('رابط WhatsApp').fill('https://wa.me/966500000001');
  await page.getByRole('button',{name:'حفظ التواصل'}).click();
  await page.getByText('تم حفظ التغييرات بنجاح').waitFor();
  let response=await page.request.get(base+'/api/admin/content',{headers:{'x-admin-secret':secret}});
  let data=await response.json();assert.equal(data.contact.whatsapp,'https://wa.me/966500000001');
  console.log('PASS contact edit button persists WhatsApp');

  await go('المحتوى');
  await page.getByPlaceholder('السؤال',{exact:true}).fill('سؤال اختبار وظائف اللوحة');
  await page.getByPlaceholder('الإجابة',{exact:true}).fill('إجابة الاختبار الأولى');
  await page.getByRole('button',{name:'إضافة سؤال'}).click();
  await page.getByText('سؤال اختبار وظائف اللوحة',{exact:true}).waitFor();
  const entry=page.locator('li').filter({hasText:'سؤال اختبار وظائف اللوحة'}).first();
  await entry.getByRole('button',{name:'تعديل'}).click();
  await entry.locator('textarea').fill('الإجابة بعد التعديل');
  await entry.getByRole('button',{name:'حفظ'}).click();
  await page.getByText('الإجابة بعد التعديل',{exact:true}).waitFor();
  await entry.getByRole('button',{name:'حذف'}).click();
  await page.waitForTimeout(250);
  await page.reload();
  await go('المحتوى');
  assert.equal(await page.getByText('سؤال اختبار وظائف اللوحة',{exact:true}).count(),0);
  console.log('PASS FAQ add/edit/delete buttons survive reload');

  response=await page.request.get(base+'/api/admin/content',{headers:{'x-admin-secret':secret}});
  data=await response.json();
  const draft={q:'اختبار مسودة للموافقة',a:'محتوى مسودة تجريبية',createdAt:'2026-11-14T00:00:00Z',status:'pending'};
  const seeded=await page.request.post(base+'/api/admin/content',{headers:{'x-admin-secret':secret},data:{drafts:[...data.drafts,draft],expectedUpdatedAt:data.updatedAt}});
  assert.equal(seeded.status(),200);
  await page.reload();await go('المراجعات');
  const review=page.locator('li').filter({hasText:draft.q}).first();
  await review.getByRole('button',{name:'اعتماد ونشر'}).click();
  await page.getByText('الحالة: approved', {exact:false}).waitFor();
  response=await page.request.get(base+'/api/admin/content',{headers:{'x-admin-secret':secret}});
  data=await response.json();
  assert.ok(data.faqs.some(f=>f.q===draft.q));assert.equal(data.drafts.find(d=>d.q===draft.q).status,'approved');
  console.log('PASS review approval writes FAQ and changes draft status');

  await go('المنافسون');
  await page.getByPlaceholder('الاسم',{exact:true}).fill('منافس تجريبي');
  await page.getByPlaceholder('النطاق',{exact:true}).fill('e2e-competitor.example');
  await page.getByRole('button',{name:'إضافة',exact:true}).click();
  const cRow=page.locator('tr').filter({hasText:'e2e-competitor.example'}).first();
  await cRow.waitFor();
  await cRow.locator('select').selectOption('inactive');
  await page.waitForTimeout(350);
  response=await page.request.get(base+'/api/admin/market/competitors',{headers:{'x-admin-secret':secret}});
  const comps=await response.json();
  assert.equal(comps.competitors.find(c=>c.domain==='e2e-competitor.example').status,'inactive');
  console.log('PASS competitor add and status update via API');

  await go('الكلمات المفتاحية');
  await page.getByPlaceholder('المصطلح',{exact:true}).fill('كلمة اختبار الإدارة');
  await page.getByLabel('لغة الكلمة المفتاحية').selectOption('ar');
  await page.getByRole('button',{name:'إضافة',exact:true}).click();
  const kRow=page.locator('tr').filter({hasText:'كلمة اختبار الإدارة'}).first();
  await kRow.waitFor();
  await kRow.getByRole('button',{name:'حذف'}).click();
  await page.reload();await go('الكلمات المفتاحية');
  assert.equal(await page.locator('tr').filter({hasText:'كلمة اختبار الإدارة'}).count(),0);
  console.log('PASS market keyword add/delete via actual buttons');

  await page.setViewportSize({width:375,height:750});
  await page.getByLabel('فتح القائمة').click();
  const menu=page.locator('aside nav');await menu.evaluate(el=>{el.scrollTop=el.scrollHeight});
  await menu.getByRole('button',{name:'الإعدادات'}).click();
  await page.getByRole('heading',{name:'الإعدادات'}).first().waitFor();
  await page.getByRole('button',{name:'مصادر البحث والوكيل'}).click();
  await page.getByRole('heading',{name:'وكيل GEO — حالة النظام'}).waitFor();
  console.log('PASS mobile sidebar navigation and settings shortcuts');

  await page.setViewportSize({width:1280,height:800});
  await page.getByRole('button',{name:'تسجيل الخروج'}).click();
  await page.getByPlaceholder('المفتاح السري').waitFor();
  console.log('PASS logout returns to login');
 }catch(e){
  await page.screenshot({path:'/tmp/admin-dashboard-browser-e2e-failure.png',fullPage:true}).catch(()=>{});
  console.error('BROWSER_E2E_FAIL',e?.message||e);
  process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('BROWSER_E2E_FATAL',e.message);process.exitCode=1});
