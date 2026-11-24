'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {config,authentic,command,render,chunks}=require('../src/lib/telegram-ops-core.cjs');
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
