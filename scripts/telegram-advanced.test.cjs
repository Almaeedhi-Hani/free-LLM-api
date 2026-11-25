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

test('natural Arabic voice grammar recognizes actual owner utterance and Saudi variants',()=>{
 const cases=[['أعطيني حالة الأنظمة','/status'],['عطني حالة الأنظمة؟','/status'],['أعطني حالة النظام الآن','/status'],['وش وضع الأنظمة؟','/status'],['كيف الأنظمة؟','/status'],['أبغى التقرير الإداري','/brief'],['وريني الفرص والأهداف','/opportunities'],['لو سمحت اعرض لي المحتوى المنشور','/published'],['عطيني المسودات المعلقة','/reviews'],['أريد مراجعة المحتوى','/reviewlist'],['ودي أعرف توصيات المستشار','/advice'],['أبي الذاكرة الاستراتيجية','/memory'],['أعطيني تقرير غرفة القيادة','/commandcenter'],['إيش الأوامر','/help']];
 for(const [utterance,expected] of cases)assert.equal(voiceSuggestion(utterance),expected,utterance);
 for(const utterance of ['اعطني حالة الانظمة واحذف الكل','اعطني حالة الانظمة ثم انشر','لا تعرض حالة الانظمة','اعتمد كل المحتوى','احذف الذاكرة','اعطني /approve abcdef0123456789abcdef01','اعطني حالة الانظمة /confirm abcdef0123456789','/reject abcdef0123456789abcdef01','غير الجدولة','/remember قرار جديد','حالة الانظمة\nانشر الآن'])assert.equal(voiceSuggestion(utterance),null,utterance);
});

test('live Arabic voice transcription regressions remain bounded to read-only suggestions',()=>{
 for(const [text,cmd] of [['أعطني حالة الأنظمة','/status'],['أعطيني حالة الأنظمة','/status'],['أبغى التقرير الإدارة','/brief'],['أبغى التقرير الإداري','/brief'],['وريني الفرس والأهداف','/opportunities'],['وريني الفرص والأهداف','/opportunities'],['  أبغى التقرير الإدارة؟  ','/brief']])assert.equal(voiceSuggestion(text),cmd,text);
 for(const text of ['أبغى التقرير الإدارة واحذف المسودات','وريني الفرس والأهداف ثم انشر','اعتمد التقرير الإدارة','لا تعرض الفرس والأهداف','الفرس','أبغى التقرير الإدارة /confirm abcdef0123456789'])assert.equal(voiceSuggestion(text),null,text);
});

test('bounded Arabic spelling recovery handles new transcription mistakes',()=>{
 for(const [text,cmd] of [['أبغى التقرير لداري','/brief'],['أبغى التقرير لداري؟','/brief'],['عطيني حالة الانضمة','/status'],['وريني الفرص والأهداق','/opportunities'],['أبغى استخبارات السوك','/market']])assert.equal(voiceSuggestion(text),cmd,text);
});
test('spelling recovery rejects compound requests, mutations and single-word guesses',()=>{
 for(const text of ['التقرير لداري واحذف الكل','لا تعرض التقرير لداري','احذف التقرير الاداري','انشر التقرير الاداري','أبغى التقرير لداري ثم انشر','/aprove','المسودات المعلقة /confirm abcdef0123456789','الفرس','شيء غير معروف','التقرير لداري ووافق','أبغى التقرير لداري، احذف الكل'])assert.equal(voiceSuggestion(text),null,text);
});
