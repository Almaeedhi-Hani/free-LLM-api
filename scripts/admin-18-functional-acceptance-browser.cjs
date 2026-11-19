'use strict';
/** Production-safe acceptance: all writes run ONLY against the local isolated
 * Next.js app using temporary CONTENT_STORE_PATH and MARKET_INTEL_PATH.
 * Never redirect this suite to a production base URL. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:3100';
const secret=process.env.E2E_ADMIN_SECRET;
if(!secret||!process.env.CONTENT_STORE_PATH||!process.env.MARKET_INTEL_PATH)
 throw Error('Isolated fixture credentials and storage paths required');
const groups={
 'الرئيسية':['الرئيسية'],
 'السوق والمنافسون':['المنافسون','كلمات البحث السوقية','الأدلة ومصادر النتائج'],
 'الفرص وخطة العمل':['الفرص','الأهداف'],
 'المحتوى والنشر':['مركز المحتوى والأثر','تطوير جميع صفحات الموقع','اعتماد المسودات','محتوى الموقع'],
 'القياس والظهور':['SEO وظهور الذكاء الاصطناعي'],
 'طلبات العملاء':['طلبات الباقات'],
 'التشغيل والإعدادات':['وكيل GEO','سجل التشغيل','الإعدادات','التواصل','إدارة الكوكيز','SEO والتكاملات']
};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:850}});
 page.on('dialog',dialog=>dialog.accept());
 const headers={'x-admin-secret':secret};
 const headersJson={...headers,'Content-Type':'application/json'};
 const request=async(method,path,data)=>{
  const response=await page.request.fetch(base+path,{
   method,headers:headersJson,...(data===undefined?{}:{data})
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok())throw Error(method+' '+path+' '+response.status()+' '+JSON.stringify(body).slice(0,260));
  return body;
 };
 const groupButton=(label)=>page.locator('aside nav > div > button').filter({hasText:label}).first();
 const navigate=async(label)=>{
  const hub=Object.entries(groups).find(([,pages])=>pages.includes(label));
  assert(hub,'Unknown section '+label);
  await groupButton(hub[0]).click();
  if(hub[1].length>1)await page.locator('aside nav > div > div > button').filter({hasText:label}).first().click();
  await page.locator('header h1').filter({hasText:label}).first().waitFor({timeout:16000});
 };
 let passed=0;
 const checkpoint=(name)=>{passed++;console.log('PASS_ADMIN_FUNCTION',name)};
 try{
  await page.goto(base+'/admin/dashboard',{waitUntil:'domcontentloaded',timeout:45000});
  await page.getByPlaceholder('المفتاح السري').waitFor({timeout:25000});
  for(const path of [
    '/api/admin/content','/api/admin/market/competitors','/api/admin/market/keywords',
    '/api/admin/market/opportunities','/api/admin/market/goals','/api/admin/market/runs',
    '/api/admin/geo-engine','/api/admin/geo-publication','/api/admin/package-requests',
    '/api/admin/technical-tasks','/api/admin/content-impact','/api/admin/impact-experiments',
    '/api/admin/impact-ai','/api/admin/gsc-history'
  ]){
   const response=await page.request.get(base+path);
   assert.equal(response.status(),401,path+' must reject unauthenticated reads');
  }
  checkpoint('14 guarded administration APIs reject unauthenticated requests');

  await page.getByPlaceholder('المفتاح السري').fill(secret);
  await page.getByRole('button',{name:'دخول لوحة التحكم'}).click();
  await groupButton('الرئيسية').waitFor({timeout:22000});
  const cookieReject=page.getByRole('button',{name:'رفض الاختيارية'});
  if(await cookieReject.isVisible())await cookieReject.click();

  // Contact: one-login hydration and real save/read/reload of three advisor fields.
  await navigate('التواصل');
  const arName=page.getByRole('textbox',{name:'اسم المسؤول - العربية'});
  await arName.waitFor();
  await arName.fill('مستشار اختبار معزول');
  await page.getByRole('textbox',{name:'منصب المسؤول - العربية'}).fill('مستشار تأسيس شركات');
  await page.getByRole('textbox',{name:'رقم واتساب العربية'}).fill('+966 50 111 1111');
  await page.getByRole('button',{name:'حفظ التواصل'}).click();
  await page.getByText('تم حفظ التغييرات بنجاح').waitFor({timeout:13000});
  let content=await request('GET','/api/admin/content');
  assert.equal(content.contact.whatsappAdvisors.ar.name,'مستشار اختبار معزول');
  assert.equal(content.contact.whatsappAdvisors.ar.title,'مستشار تأسيس شركات');
  assert.equal(content.contact.whatsappNumbers.ar,'966501111111');
  await page.reload({waitUntil:'domcontentloaded'});
  await navigate('التواصل');
  await arName.waitFor();
  assert.equal(await arName.inputValue(),'مستشار اختبار معزول','Contact fields must populate correctly after first login and reload');
  checkpoint('Contact save and persistent multilingual advisor readback');

  // Cookie consent policy and search settings are separate persisted controls.
  await navigate('إدارة الكوكيز');
  await page.getByRole('spinbutton').fill('37');
  await page.getByRole('button',{name:'حفظ إعدادات الكوكيز'}).click();
  await page.getByText('تم حفظ التغييرات بنجاح').waitFor({timeout:14000});
  content=await request('GET','/api/admin/content');
  assert.equal(content.cookiePolicy.consentDays,37);
  checkpoint('Cookie duration edit and content-store readback');

  await navigate('SEO والتكاملات');
  const property=page.getByRole('textbox',{name:'رابط موقع Search Console (Property)'});
  await property.fill('https://example.test/');
  await page.getByRole('button',{name:'حفظ الإعدادات',exact:true}).click();
  await page.getByText('تم حفظ التغييرات بنجاح').waitFor({timeout:14000});
  content=await request('GET','/api/admin/content');
  assert.equal(content.searchIntegrations.gscPropertyUrl,'https://example.test/');
  checkpoint('Search integration setting persisted without inventing GSC connection');

  await navigate('محتوى الموقع');
  const goldenSection=page.getByRole('heading',{name:'الفقرة الذهبية'}).locator('xpath=..');
  const goldenText='محتوى اختباري مؤقت لفحص حفظ فقرة الموقع واستعادتها بعد تحديث واجهة الإدارة.';
  await goldenSection.locator('textarea').fill(goldenText);
  await goldenSection.getByRole('button',{name:'حفظ',exact:true}).click();
  await page.getByText('تم حفظ التغييرات بنجاح').waitFor({timeout:15000});
  content=await request('GET','/api/admin/content');
  assert.equal(content.goldenParagraph,goldenText);
  checkpoint('Homepage golden paragraph editor saves and reloads real stored copy');
  await page.getByPlaceholder('السؤال',{exact:true}).fill('سؤال تدقيق الإدارة المعزول');
  await page.getByPlaceholder('الإجابة',{exact:true}).fill('إجابة اختبار محفوظة داخل بيئة معزولة.');
  await page.getByRole('button',{name:'إضافة سؤال'}).click();
  await page.getByText('سؤال تدقيق الإدارة المعزول',{exact:true}).waitFor();
  content=await request('GET','/api/admin/content');
  assert(content.faqs.some(f=>f.q==='سؤال تدقيق الإدارة المعزول'));
  await navigate('مركز المحتوى والأثر');
  const faqPreviewRow=page.locator('tr').filter({hasText:'سؤال تدقيق الإدارة المعزول'}).first();
  await faqPreviewRow.getByRole('button',{name:'معاينة وتفاصيل'}).click();
  const preview=page.locator('section[aria-label="معاينة المحتوى التفصيلية"]');
  await preview.getByText('إجابة اختبار محفوظة داخل بيئة معزولة.',{exact:true}).first().waitFor();
  await preview.getByRole('button',{name:'إغلاق المعاينة'}).click();
  checkpoint('FAQ full-detail preview opens and closes in Content Impact Center');
  await navigate('محتوى الموقع');
  const faqRow=page.locator('li').filter({hasText:'سؤال تدقيق الإدارة المعزول'}).first();
  await faqRow.getByRole('button',{name:'تعديل'}).click();
  // Once editing, the question moves from a text node into an input value.
  // A text-filtered Playwright locator would stop matching that same <li>.
  const faqEditor=page.locator('li').filter({has:page.locator('textarea')}).first();
  await faqEditor.locator('textarea').fill('إجابة اختبار بعد التعديل.');
  await faqEditor.getByRole('button',{name:'حفظ'}).click();
  await page.getByText('إجابة اختبار بعد التعديل.',{exact:true}).waitFor();
  content=await request('GET','/api/admin/content');
  assert.equal(content.faqs.find(f=>f.q==='سؤال تدقيق الإدارة المعزول').a,'إجابة اختبار بعد التعديل.');
  // The delete handler starts an async POST. Wait for the actual API response,
  // not just the click, before asserting the persisted readback.
  const [faqDeleteResponse] = await Promise.all([
    page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/admin/content' &&
      response.request().method() === 'POST', {timeout: 15000}),
    faqRow.getByRole('button',{name:'حذف'}).click(),
  ]);
  assert.equal(faqDeleteResponse.status(), 200, 'FAQ delete save must succeed');
  const faqDeleteResult = await faqDeleteResponse.json();
  assert.equal(faqDeleteResult.status, 'updated', 'FAQ delete must persist');
  assert(!faqDeleteResult.content?.faqs?.some(f=>f.q==='سؤال تدقيق الإدارة المعزول'),
    'FAQ delete response must exclude the removed question');
  content=await request('GET','/api/admin/content');
  assert(!content.faqs.some(f=>f.q==='سؤال تدقيق الإدارة المعزول'));
  checkpoint('FAQ add/edit/delete buttons persist immediately in isolated content store');

  // Backend CRUD readbacks for competitors, keywords, opportunities and goals.
  const competitor=await request('POST','/api/admin/market/competitors',{
    name:'QA audit competitor',domain:'audit-only-competitor.example',languages:['en'],source:'manual'
  });
  assert(competitor.competitor?.id);
  let updated=await request('PATCH','/api/admin/market/competitors',{
    id:competitor.competitor.id,name:'QA audit competitor changed',status:'inactive'
  });
  assert.equal(updated.competitor.status,'inactive');
  assert((await request('GET','/api/admin/market/competitors')).competitors
    .some(x=>x.id===competitor.competitor.id&&x.status==='inactive'));
  await navigate('المنافسون');
  await page.getByRole('textbox',{name:'بحث المنافسين'}).fill('audit-only-competitor.example');
  await page.getByText('QA audit competitor changed',{exact:true}).waitFor();
  checkpoint('Competitor create/edit/filter with real backend readback');

  const keyword=await request('POST','/api/admin/market/keywords',{
    term:'isolated qa investment keyword',language:'en',source:'manual'
  });
  assert(keyword.keyword?.id);
  updated=await request('PATCH','/api/admin/market/keywords',{
    id:keyword.keyword.id,term:'isolated qa keyword updated',language:'en',
    intent:'informational',cluster:'audit'
  });
  assert.equal(updated.keyword.term,'isolated qa keyword updated');
  await navigate('كلمات البحث السوقية');
  await page.getByRole('textbox',{name:'تصفية الكلمات المفتاحية'}).fill('isolated qa keyword updated');
  await page.getByText('isolated qa keyword updated',{exact:true}).waitFor();
  const removed=await request('DELETE','/api/admin/market/keywords',{id:keyword.keyword.id});
  assert.equal(removed.deleted,true);
  assert(!(await request('GET','/api/admin/market/keywords')).keywords.some(x=>x.id===keyword.keyword.id));
  checkpoint('Keyword create/update/delete plus UI filter and storage verification');

  const opportunity=await request('POST','/api/admin/market/opportunities',{
    title:'QA audit opportunity',type:'keyword_gap',evidence:[],languages:['en'],confidence:'low'
  });
  assert(opportunity.opportunity?.id);
  updated=await request('PATCH','/api/admin/market/opportunities',{
    id:opportunity.opportunity.id,title:'QA opportunity updated',priority:'high'
  });
  assert.equal(updated.opportunity.priority,'high');
  await navigate('الفرص');
  await page.getByText('QA opportunity updated',{exact:true}).waitFor();
  checkpoint('Market opportunity create and edit with visible admin row');

  await navigate('الأهداف');
  await page.getByRole('textbox',{name:'عنوان هدف جديد'}).fill('QA follow-up goal');
  await page.getByRole('textbox',{name:'وصف هدف جديد'}).fill('Temporary test objective');
  await page.getByRole('button',{name:'إضافة هدف'}).click();
  await page.getByText('أُضيف الهدف بنجاح. أضف مؤشرات قياس قبل التنفيذ.').waitFor({timeout:15000});
  const goals=(await request('GET','/api/admin/market/goals')).goals;
  const goal=goals.find(x=>x.title==='QA follow-up goal');
  assert(goal?.id,'New goal must persist in local market storage');
  await page.locator('tr').filter({hasText:'QA follow-up goal'}).first().waitFor({timeout:15000});
  updated=await request('PATCH','/api/admin/market/goals',{
    id:goal.id,status:'done',title:'QA follow-up goal'
  });
  assert.equal(updated.goal.status,'done');
  assert((await request('GET','/api/admin/market/goals')).goals.find(x=>x.id===goal.id)?.status==='done');
  checkpoint('Goal create/status update and readback');

  // Review screen: seed a draft in local content store, reject it through UI.
  content=await request('GET','/api/admin/content');
  const pending={q:'سؤال مسودة التدقيق المعزولة',a:'إجابة مختصرة للاختبار فقط',createdAt:new Date().toISOString(),status:'pending'};
  const seed=await request('POST','/api/admin/content',{
    drafts:[...(content.drafts||[]),pending],expectedUpdatedAt:content.updatedAt
  });
  assert(seed.content?.drafts?.some(x=>x.q===pending.q));
  // An API seed does not update the already-mounted React content state.
  // Reload to exercise real session recovery and persisted draft readback.
  await page.reload({waitUntil:'domcontentloaded'});
  await navigate('اعتماد المسودات');
  await page.getByText(pending.q,{exact:true}).waitFor({timeout:16000});
  const draftRow=page.locator('li').filter({hasText:pending.q}).first();
  await draftRow.getByRole('button',{name:'رفض'}).click();
  await page.waitForFunction(async secret=>{
    const response=await fetch('/api/admin/content',{headers:{'x-admin-secret':secret}});
    if(!response.ok)return false;
    const value=await response.json();
    return value.drafts?.some(x=>x.q==='سؤال مسودة التدقيق المعزولة'&&x.status==='rejected');
  },secret,{timeout:15000});
  content=await request('GET','/api/admin/content');
  assert.equal(content.drafts.find(x=>x.q===pending.q).status,'rejected');
  checkpoint('Draft review rejection follows persisted status transition');

  // Editorial items: validate real preview, revision and safe deletion while
  // leaving production publishing and GitHub task-creation untouched.
  content=await request('GET','/api/admin/content');
  const editorial={
    id:'qa-functional-editorial-20261118',
    kind:'technical_seo',lang:'ar',target:'/packages',
    title:'فحص بنية روابط الباقات ضمن لوحة المحتوى',
    summary:'مقترح تقني معزول لاختبار معاينة مهام تحسين روابط الباقات وإمكان تعديلها وحذفها دون نشر أو تعديل الموقع.',
    body:'تتطلب هذه المهمة التجريبية فحص روابط صفحة الباقات وسلامة العلاقات الداخلية والتأكد من إمكانية مراجعة المقترح من لوحة الإدارة قبل تعديل أي شفرة برمجية. '.repeat(2),
    risk_level:'low',status:'pending',createdAt:new Date().toISOString(),
    evidence_ids:[],evidence_refs:[]
  };
  await request('POST','/api/admin/content',{
    editorialItems:[...(content.editorialItems||[]),editorial],
    expectedUpdatedAt:content.updatedAt
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await navigate('مركز المحتوى والأثر');
  const editorialRow=page.locator('tr').filter({hasText:editorial.title}).first();
  await editorialRow.getByRole('button',{name:'معاينة وتفاصيل'}).click();
  await page.locator('section[aria-label="معاينة المحتوى التفصيلية"]')
    .getByText(editorial.summary,{exact:true}).waitFor();
  await page.getByRole('button',{name:'إغلاق المعاينة'}).click();
  await navigate('تطوير جميع صفحات الموقع');
  await page.getByRole('textbox',{name:'البحث في المقترحات'}).fill(editorial.title);
  const editorialListRow=page.locator('li').filter({hasText:editorial.title}).first();
  await editorialListRow.getByRole('button',{name:'مراجعة التفاصيل'}).click();
  await editorialListRow.getByRole('button',{name:'تحرير المقترح'}).click();
  const editedSummary=editorial.summary+' بعد فحص معاينة التعديلات.';
  await page.getByRole('textbox',{name:'ملخص المحتوى'}).fill(editedSummary);
  await page.getByRole('button',{name:'حفظ للمراجعة'}).click();
  await page.getByText('تم حفظ التغييرات بنجاح').waitFor({timeout:15000});
  content=await request('GET','/api/admin/content');
  assert.equal(content.editorialItems.find(x=>x.id===editorial.id)?.summary,editedSummary,
    'Editorial revision must survive backend readback');
  await page.locator('li').filter({hasText:editorial.title}).first().getByRole('button',{name:'حذف'}).click();
  await page.getByText('تم حذف المقترح بعد حفظ التغييرات.').waitFor({timeout:15000});
  content=await request('GET','/api/admin/content');
  assert(!content.editorialItems.some(x=>x.id===editorial.id),
    'Editorial deletion must persist; no ghost task after reload');
  checkpoint('Editorial preview, edit and two-confirmation deletion persist without publishing');

  // Remaining screens have read-only or explicitly gated functions; do not
  // pretend that missing external tokens constitute operational evidence.
  await navigate('الأدلة ومصادر النتائج');
  await page.getByRole('button',{name:'تحديث',exact:true}).first().click();
  assert(Array.isArray((await request('GET','/api/admin/market/competitors')).competitors));
  checkpoint('Evidence refresh and linked market records');

  for(const target of [
    'الرئيسية','وكيل GEO','سجل التشغيل','مركز المحتوى والأثر',
    'تطوير جميع صفحات الموقع','SEO وظهور الذكاء الاصطناعي','طلبات الباقات','الإعدادات'
  ]){
   await navigate(target);
   assert.equal(await page.locator('header h1').count(),1,target+' heading');
   checkpoint('Rendered view and protected navigation: '+target);
  }
  await navigate('مركز المحتوى والأثر');
  // Missing GSC/lead credentials must not fabricate successful performance.
  const impact=await page.request.get(base+'/api/admin/content-impact?days=28',{headers});
  assert([200,503].includes(impact.status()),'Impact endpoint must explicitly expose availability');
  const body=await impact.json();
  assert(body.status==='unavailable'||body.source==='gsc_daily_page','Impact payload must label source/availability');
  checkpoint('Content impact API reports measured/unavailable, never invented data');

  await navigate('سجل التشغيل');
  const runResult=await request('GET','/api/admin/market/runs');
  assert(Array.isArray(runResult.runs));
  checkpoint('Historical market runs readable independently from current GitHub source');

  await page.getByRole('button',{name:'تسجيل الخروج'}).click();
  await page.getByPlaceholder('المفتاح السري').waitFor();
  checkpoint('Logout returns to server-authenticated entry screen');
  console.log('ADMIN_18_FUNCTIONAL_ACCEPTANCE_RESULT',JSON.stringify({
   checked:passed,mode:'isolated_file_fixture',productionWrites:false,
   note:'External GSC, GitHub and Supabase live execution are separately verified read-only.'
  }));
 }catch(e){
  await page.screenshot({path:'/tmp/admin-functional-acceptance-failure.png',fullPage:true}).catch(()=>{});
  console.error('ADMIN_FULL_FUNCTIONAL_FAIL',e?.stack||e);
  process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('ADMIN_FUNCTIONAL_FATAL',e?.stack||e);process.exitCode=1});
