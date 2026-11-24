'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {coordinate,report}=require('../src/lib/telegram-ops-coordinator.cjs');
const {keyboard,normalizeCommand}=require('../src/lib/telegram-ops-core.cjs');
const d={now:'2026-11-24T18:00:00Z',radar:{status:'success',finished_at:'2026-11-24T17:00:00Z'},geo:{status:'error',lastRun:'2026-11-24T15:00:00Z'},gsc:{status:'success_with_data',checked_at:'2026-11-24T01:00:00Z',metric_date:'2026-11-21',rows_fetched:0},watchdog:{status:'success',finished_at:'2026-11-24T17:00:00Z'},watchdogIssues:[{number:42}],opportunities:[{title:'فرصة',score:92,priority:'high'}],pending:0,publishedCount:10,publication:null,ai:null};
test('five evidence-grounded specialists and failure ranked before normal activity',async()=>{
 const rows=await coordinate(d);assert.equal(rows.length,5);
 assert.equal(rows[2].priority,1);assert.equal(rows[3].priority,1);
 const t=await report(d);assert.match(t,/فرصة/);assert.match(t,/صفوف: 0/);assert.match(t,/issues\/42/);assert.match(t,/المراجعات المعلقة: 0/);assert.match(t,/لم ينفذ أي إجراء/);
 assert(t.indexOf('راجع سبب تعطل أو تأخر GEO',t.indexOf('الأولويات المقترحة'))<t.indexOf('راجع أدلة الفرصة',t.indexOf('الأولويات المقترحة')));
});
test('missing evidence never becomes healthy or a zero count',async()=>{
 const t=await report({now:d.now});assert.match(t,/الحالة غير مؤكدة/);assert.match(t,/بلاغات مفتوحة: غير متاح/);assert.match(t,/لا توجد ملاحظة مؤكدة/);
});
test('worker failure is isolated and independent workers start before join',async()=>{
 let started=0,release;
 const barrier=new Promise(r=>{release=r;});
 const running=coordinate(d,{one:async()=>{started++;await barrier;return {worker:'one'};},two:()=>{started++;throw Error('secret');}});
 await Promise.resolve();assert.equal(started,2);release();
 const results=await running;assert.equal(results[0].worker,'one');assert.equal(results[1].priority,2);assert(!JSON.stringify(results).includes('secret'));
});
test('coordinator Arabic button is separately gated and normalized',()=>{
 assert(!keyboard(true,false).keyboard.flat().some(x=>x.text==='غرفة القيادة'));
 assert(keyboard(false,true).keyboard.flat().some(x=>x.text==='غرفة القيادة'));
 assert.equal(normalizeCommand('غرفة القيادة'),'/commandcenter');
});

test('known priority and publication status localized, source title retained',async()=>{
 const t=await report({...d,opportunities:[{title:'Original source title',score:85,priority:'critical'}],publication:{status:'published',published_at:d.now}});
 assert(t.includes('الأولوية: حرجة'));assert(t.includes('آخر سجل نشر: منشور'));assert(t.includes('Original source title'));assert(t.includes('بلغة المصدر'));
});
