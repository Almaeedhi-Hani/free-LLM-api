'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {normalizeWhatsAppNumber,defaultWhatsAppNumber,whatsAppNumberForLanguage,whatsAppUrlForLanguage}=
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
assert.equal(whatsAppUrlForLanguage(contact,'ar'),'https://wa.me/966501111111');
assert.equal(whatsAppUrlForLanguage(contact,'en'),'https://wa.me/966502222222');
assert.equal(whatsAppUrlForLanguage(contact,'zh'),'https://wa.me/966503333333');
assert.equal(whatsAppNumberForLanguage({...contact,whatsappNumbers:{ar:'',en:'',zh:''}},'zh'),'966545059528');
assert.equal(whatsAppUrlForLanguage({whatsapp:'https://evil.test/?phone=1'},'en'),null);
const content=fs.readFileSync('src/lib/content-store.ts','utf8');
assert(content.includes('whatsappNumbers?:'));
assert(content.includes('...patch.contact?.whatsappNumbers'),'partial contact edits retain independently assigned numbers');
const app=fs.readFileSync('src/app/layout.tsx','utf8');
assert(app.includes('<WhatsAppFloat locale={lang} contact={contact}/>'),'floating WhatsApp is mounted');
assert(app.includes('whatsAppUrlForLanguage(contact,lang)'),'footer uses locale-specific URL');
const home=fs.readFileSync('src/app/page.tsx','utf8');
assert(home.includes('whatsAppUrlForLanguage(content.contact,lang)'),'home CTA uses locale-specific URL');
const float=fs.readFileSync('src/components/WhatsAppFloat.tsx','utf8');
for(const value of ['usePathname','pathname.startsWith(\'/admin/\')','aria-expanded={open}',
 'options.map','target="_blank"','rel="noopener noreferrer"','Choose your advisor language','选择顾问语言'])
 assert(float.includes(value),'missing floating UI behavior: '+value);
const admin=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
for(const value of ['whatsappAr','whatsappEn','whatsappZh','whatsappNumbers:',
 'رقم واتساب العربية','رقم واتساب الإنجليزية','رقم واتساب الصينية','contactToForm'])
 assert(admin.includes(value),'missing admin configuration: '+value);
const route=fs.readFileSync('src/app/api/admin/content/route.ts','utf8');
assert(route.includes('normalizeWhatsAppNumber(numbers[lang])'));
assert(route.includes("!['ar','en','zh'].includes(key)"));
assert(route.includes('if (!isAuthorized(req))'),'server controls require admin auth');
console.log('PASS per-language WhatsApp routing, safe phone validation, admin persistence, and public-only floating button');
