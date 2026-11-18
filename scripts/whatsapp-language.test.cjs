'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {normalizeWhatsAppNumber,defaultWhatsAppNumber,whatsAppNumberForLanguage,whatsAppUrlForLanguage,validWhatsAppAdvisorField}=
  require('../.whatsapp-test-build/whatsapp-contacts.js');
const contact={
 whatsapp:'https://wa.me/966545059528',
 whatsappNumbers:{ar:'966501111111',en:'+966 50 222 2222',zh:'966503333333'}
};
assert.equal(normalizeWhatsAppNumber('+966 50 222 2222'),'966502222222');
assert.equal(normalizeWhatsAppNumber('96650-222-2222'),'966502222222');
for(const invalid of ['05 2222 2222','https://wa.me/966500000000','javascript:alert(1)','+','+1 22',null,'+000000000000'])
 assert.equal(normalizeWhatsAppNumber(invalid),null,'reject '+String(invalid));
assert.equal(defaultWhatsAppNumber(contact),'966545059528');
assert.equal(validWhatsAppAdvisorField('أحمد بن محمد',80),true);
assert.equal(validWhatsAppAdvisorField('Senior Investment Advisor',100),true);
assert.equal(validWhatsAppAdvisorField('中文投资顾问',80),true);
assert.equal(validWhatsAppAdvisorField('',80),true,'name and title remain optional; no invented names');
for(const invalid of ['<script>', 'Bad'+String.fromCharCode(10)+'Newline', 'x'.repeat(81)])
 assert.equal(validWhatsAppAdvisorField(invalid,80),false);

assert.equal(whatsAppUrlForLanguage(contact,'ar'),'https://wa.me/966501111111');
assert.equal(whatsAppUrlForLanguage(contact,'en'),'https://wa.me/966502222222');
assert.equal(whatsAppUrlForLanguage(contact,'zh'),'https://wa.me/966503333333');
assert.equal(whatsAppNumberForLanguage({...contact,whatsappNumbers:{ar:'',en:'',zh:''}},'zh'),'966545059528');
assert.equal(whatsAppUrlForLanguage({whatsapp:'https://evil.test/?phone=1'},'en'),null);
const content=fs.readFileSync('src/lib/content-store.ts','utf8');
assert(content.includes('whatsappNumbers?:'));
assert(content.includes('whatsappAdvisors?:'),'advisor profiles persisted in contact');
assert(content.includes('...patch.contact?.whatsappAdvisors'),'other language advisors preserved on partial contact updates');
assert(content.includes('...patch.contact?.whatsappNumbers'),'partial contact edits retain independently assigned numbers');
const app=fs.readFileSync('src/app/layout.tsx','utf8');
assert(app.includes('<WhatsAppFloat locale={lang} contact={contact}/>'),'floating WhatsApp is mounted');
assert(app.includes('whatsAppUrlForLanguage(contact,lang)'),'footer uses locale-specific URL');
const home=fs.readFileSync('src/app/page.tsx','utf8');
assert(home.includes('whatsAppUrlForLanguage(content.contact,lang)'),'home CTA uses locale-specific URL');
const float=fs.readFileSync('src/components/WhatsAppFloat.tsx','utf8');
for(const value of ['usePathname','pathname.startsWith(\'/admin/\')','aria-expanded={open}',
 'options.map','target="_blank"','rel="noopener noreferrer"','Speak to our advisors','联系投资顾问',
 'contact.whatsappAdvisors?.[lang.key]','profile?.name?.trim()','profile?.title?.trim()',
 'spoken[locale][option.key]','option.title','aria-label={t.openChat'])
 assert(float.includes(value),'missing floating UI behavior: '+value);
// Approved pixel dimensions with intrinsic responsive viewport limits.
for(const className of [
 'h-[315px]','w-[280px]','max-w-[calc(100vw-32px)]',
 'max-h-[calc(100dvh-112px)]','min-h-0 flex-1','overflow-y-auto',
 'overscroll-contain','tabIndex={0}','shrink-0','min-h-[62px]',
 'h-9 w-9','truncate text-[12px]','truncate text-[10px]'
])assert(float.includes(className),'Missing compact 280x315 responsive feature: '+className);
assert(!float.includes('w-[min(90vw,365px)]'),'Old fixed-width list must be removed');
assert(!float.includes('min-h-[82px]'),'Old large advisor card spacing must be removed');
const admin=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
for(const value of ['whatsappAr','whatsappEn','whatsappZh','whatsappNumbers:',
 "numberKey:'whatsappAr'","numberKey:'whatsappEn'","numberKey:'whatsappZh'",
 "'رقم واتساب '+lang",'contactToForm'])
 assert(admin.includes(value),'missing admin configuration: '+value);
for(const value of ['advisorNameAr','advisorTitleAr','advisorNameEn','advisorTitleEn','advisorNameZh','advisorTitleZh',
 'whatsappAdvisors:','validWhatsAppAdvisorField(value,80)','validWhatsAppAdvisorField(value,100)',
 'اسم المسؤول','المنصب / المسمى الوظيفي'])
 assert(admin.includes(value),'missing editable advisor identity: '+value);
const route=fs.readFileSync('src/app/api/admin/content/route.ts','utf8');
assert(route.includes('normalizeWhatsAppNumber(numbers[lang])'));
assert(route.includes('validWhatsAppAdvisorField(profile.name,80)'));
assert(route.includes('validWhatsAppAdvisorField(profile.title,100)'));
assert(route.includes("!['ar','en','zh'].includes(lang)"));
assert(route.includes("!['ar','en','zh'].includes(key)"));
assert(route.includes('if (!isAuthorized(req))'),'server controls require admin auth');
console.log('PASS per-language WhatsApp routing, safe phone validation, admin persistence, and public-only floating button');
