'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parse,fingerprint,voiceSuggestion,safeDecision}=require('../src/lib/telegram-ops-advanced-core.cjs');
test('explicit memory only; reject ambiguous or malformed commands',()=>{
 assert.deepEqual(parse('/remember راجع الفرص قبل النشر'),{kind:'remember',decision:'راجع الفرص قبل النشر'});
 assert.equal(parse('احفظ هذا'),null);assert.equal(parse('/remember '+'x'.repeat(1001)),null);
 assert(!safeDecision('token: abc'));assert(!safeDecision('12345678:abcdefghijklmnopqrstuvwxyz1234'));
 assert(safeDecision('راجع مؤشرات السوق'));
});
test('review requires exact item key and explicit confirmation code',()=>{
 const item={q:'question',a:'answer',status:'pending'};
 const k=fingerprint('faq',item);
 assert.match(k,/^[a-f0-9]{24}$/);assert.notEqual(k,fingerprint('faq',{...item,a:'changed'}));
 assert.notEqual(k,fingerprint('editorial',item));
 assert.deepEqual(parse('/approve '+k),{kind:'approve',key:k});
 assert.equal(parse('/approve all'),null);assert.equal(parse('/confirm 123'),null);
 assert.deepEqual(parse('/confirm abcdef0123456789'),{kind:'confirm',code:'abcdef0123456789'});
});
test('voice maps read-only commands exactly, never mutations',()=>{
 assert.equal(voiceSuggestion('حالة الأنظمة؟'),'/status');
 assert.equal(voiceSuggestion('الإحاطة الإدارية'),'/brief');
 assert.equal(voiceSuggestion('/memory'),'/memory');
 for(const t of ['اعتمد كل المسودات','/approve abcdef0123456789abcdef01','/confirm abcdef0123456789','/remember test','حالة الأنظمة واحذف الكل'])assert.equal(voiceSuggestion(t),null);
});
