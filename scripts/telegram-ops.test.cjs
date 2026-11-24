'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {config,authentic,command,render,chunks,keyboard,normalizeCommand}=require('../src/lib/telegram-ops-core.cjs');
const env={TELEGRAM_OPS_ENABLED:'true',TELEGRAM_BOT_TOKEN:'123456:abcdefghijklmnopqrstuvwxyz_123456',TELEGRAM_WEBHOOK_SECRET:'a'.repeat(32),TELEGRAM_OWNER_CHAT_ID:'1234567',TELEGRAM_OWNER_USER_ID:'1234567'};
const cfg=config(env);
const update={update_id:1,message:{chat:{type:'private',id:1234567},from:{id:1234567,is_bot:false},text:'/brief'}};
test('disabled by default and mismatched owner rejected',()=>{assert.equal(config({}),null);assert.equal(config({...env,TELEGRAM_OWNER_USER_ID:'9'}),null);assert.equal(config({...env,TELEGRAM_WEBHOOK_SECRET:'short'}),null);assert(cfg);});
test('secret validation',()=>{assert(authentic(cfg.secret,cfg.secret));assert(!authentic(cfg.secret,'x'));assert(!authentic('',''));});
test('only authorized private human can send allowlisted commands',()=>{
 assert.equal(command(update,cfg),'/brief');
 for(const m of [{...update.message,chat:{type:'group',id:1234567}},{...update.message,from:{id:9,is_bot:false}},{...update.message,from:{id:1234567,is_bot:true}}])assert.equal(command({...update,message:m},cfg),null);
 assert.equal(command({...update,message:{...update.message,text:'/approve 42'}},cfg),'unknown');
 assert.equal(command({...update,message:{...update.message,voice:{file_id:'x'}}},cfg),'voice');
 assert.equal(command({update_id:1,callback_query:{}},cfg),null);
});
test('report distinguishes missing from zero and names actual outcomes',()=>{
 const d={now:'2026-11-24T12:00:00Z',radar:{status:'success',finished_at:'2026-11-24T11:00:00Z'},geo:null,gsc:null,publication:null,ai:null,pending:0,publishedCount:null,opportunities:[{title:'فرصة تأسيس الشركات'}],weekly:null};
 const message=render('/brief',d);
 assert(message.includes('فرصة تأسيس الشركات'));assert(message.includes('المسودات المعلقة: 0'));assert(message.includes('الروابط المنشورة: غير متاح'));assert(message.includes('Watchdog: غير متحقق'));assert(!message.includes('undefined'));
 assert(render('/reviews',{...d,drafts:[]}).includes('لوحة التحكم فقط'));
 assert(render('voice',{}).includes('لم تُفعّل'));
});
test('message chunks respect Telegram size and preserve unicode',()=>{const original='س'.repeat(3899)+'😀'+'ص'.repeat(4000);const result=chunks(original);assert(result.every(x=>x.length<=3900));assert.equal(result.join(''),original);});

test('Arabic buttons map to existing private commands and advanced gates',()=>{
 const expected=['/status','/brief','/market','/opportunities','/published','/reviews','/advice','/help'];
 const buttons=keyboard(false).keyboard.flat();
 assert.deepEqual(buttons.map(x=>normalizeCommand(x.text)),expected);
 for(let i=0;i<buttons.length;i++){
  assert.match(buttons[i].text,/[\u0600-\u06ff]/u);
  assert.equal(command({...update,message:{...update.message,text:buttons[i].text}},cfg),expected[i]);
  assert.equal(command({...update,message:{...update.message,text:expected[i]}},cfg),expected[i]);
  assert.equal(command({...update,message:{...update.message,text:buttons[i].text,from:{id:9,is_bot:false}}},cfg),null);
 }
 const extra=keyboard(true).keyboard.flat().slice(8);
 const {parse}=require('../src/lib/telegram-ops-advanced-core.cjs');
 assert.deepEqual(extra.map(x=>parse(normalizeCommand(x.text)).kind),['memory','reviewlist']);
 for(const button of extra)assert.equal(command({...update,message:{...update.message,text:button.text}},cfg),'unknown');
 assert.equal(normalizeCommand('/approve 123'),'/approve 123');
});

test('advanced greeting is accurate; compact health retains publication and AI evidence',()=>{
 const d={now:'2026-11-24T17:00:00Z',advanced:true,healthSummary:'مراقب الأنظمة: ناجح',publication:{status:'published',published_at:'2026-11-24T16:00:00Z'},ai:null};
 assert(render('/start',d).includes('الموافقات المؤهلة'));
 assert(!render('/start',d).includes('الأوامر الحالية للقراءة فقط'));
 const status=render('/status',d);
 assert(status.includes('مراقب الأنظمة: ناجح'));assert(status.includes('النشر التحريري: منشور'));assert(status.includes('ظهور الذكاء الاصطناعي: لا توجد نتيجة مؤكدة'));
 assert(!status.includes('Market Radar:'));assert(!status.includes('Watchdog: غير متحقق'));
});

test('review callback is owner-only, read-only and exact-key bound',()=>{
 const {reviewCallback}=require('../src/lib/telegram-ops-core.cjs');
 const q={id:'123456',from:update.message.from,message:{chat:update.message.chat},data:'review:'+'a'.repeat(24)};
 const valid=reviewCallback({update_id:2,callback_query:q},cfg);
 assert.equal(valid.update.message.text,'/review '+'a'.repeat(24));
 assert.equal(command(valid.update,cfg),'unknown');
 for(const patch of [{from:{id:9,is_bot:false}},{message:{chat:{id:1234567,type:'group'}}},{data:'approve:'+'a'.repeat(24)},{data:'confirm:1234567890abcdef'},{data:'review:bad'}])assert.equal(reviewCallback({update_id:2,callback_query:{...q,...patch}},cfg),null);
});
