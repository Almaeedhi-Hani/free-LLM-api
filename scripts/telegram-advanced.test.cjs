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

test('review cards hide identifiers, show full text, bound URLs and withhold ineligible approvals',()=>{
 const {card,decisionCard}=require('../src/lib/telegram-ops-advanced-card.cjs');
 const key='a'.repeat(24),base={key,title:'سؤال',kind:'faq',body:'إجابة كاملة',refs:[{label:'مصدر',url:'https://example.org'},{url:'javascript:alert(1)'}],index:0,total:2,next:'b'.repeat(24),full:true};
 const blocked=card({...base,eligible:false});
 assert(blocked.text.includes('إجابة كاملة'));assert(!blocked.text.includes(key));
 assert(!blocked.inline_keyboard.flat().some(b=>b.callback_data?.startsWith('approve:')));
 assert(blocked.inline_keyboard.flat().some(b=>b.callback_data==='reject:'+key));
 assert(!blocked.inline_keyboard.flat().some(b=>b.url?.startsWith('javascript:')));
 assert(card({...base,eligible:true}).inline_keyboard.flat().some(b=>b.callback_data==='approve:'+key));
 assert(!card({...base,eligible:true,full:false}).inline_keyboard.flat().some(b=>/^(approve|reject):/.test(b.callback_data||'')));
 const code='1234567890abcdef';
 const c=decisionCard('النص الكامل\n\nللتأكيد الصريح خلال 10 دقائق: /confirm '+code+'\nعدم التأكيد يعني عدم التنفيذ.');
 assert(!c.text.includes(code));assert.equal(c.inline_keyboard[0][0].callback_data,'confirm:'+code);
 assert(!decisionCard('blocked').inline_keyboard.flat().some(b=>b.callback_data?.startsWith('confirm:')));
});

test('diagnostics use exact keys, no approval or voice shortcut for blocked content',()=>{
 const {card}=require('../src/lib/telegram-ops-advanced-card.cjs');
 const key='a'.repeat(24);
 const c=card({key,title:'سؤال',kind:'faq',body:'نص',refs:[],eligible:false,index:7,total:163,full:true});
 assert(c.text.includes('8 من 163'));
 for(const k of ['verify','revise','reasons']){
  assert.deepEqual(parse('/'+k+' '+key),{kind:k,key});
  assert.equal(parse('/'+k+' all'),null);
  assert.equal(voiceSuggestion('/'+k+' '+key),null);
  assert(c.inline_keyboard.flat().some(b=>b.callback_data===k+':'+key));
 }
 assert(!c.inline_keyboard.flat().some(b=>b.callback_data?.startsWith('approve:')));
});

test('evidence gate refuses partial or unrelated claims, unsafe hosts and stale results',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const a='This fictional exact sentence is only a fixture for the source matcher';
 const b='This different fictional exact sentence is another fixture for the source matcher';
 const u='https://mc.gov.sa/en/Pages/Start-your-project.aspx',v='https://misa.gov.sa/activities/laws-regulations-copy/';
 const pages=[{url:u,sentences:[a]},{url:v,sentences:[b]}];
 assert.equal(e.match([a,b],pages).complete,true);
 assert.equal(e.match([a,b+' unsupported'],pages).complete,false);
 assert.equal(e.match([a,b],[{url:u,sentences:[a,b]}]).complete,false);
 assert.equal(e.safeUrl('https://mc.gov.sa.example.org/'),null);
 assert.equal(e.safeUrl('https://unlisted.gov.sa/'),null);
 const now=Date.now(),meta={status:'ready',digest:e.digest('faq',[a,b]),checked_at:new Date(now).toISOString()};
 assert.equal(e.eligible(meta,'faq',[a,b],now),true);
 assert.equal(e.eligible(meta,'faq',[a],now),false);
 assert.equal(e.eligible(meta,'faq',[a,b],now+86400000),false);
 assert.equal(e.due({...meta,status:'blocked'},'faq',[a,b],now),false);
 assert.equal(e.due({...meta,status:'blocked'},'faq',[a,b],now+7*86400000),true);
});

test('archive is retained as a manual exception and does not loop on identical copy',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const fields=['Example answer'],now=Date.now();
 const meta={status:'blocked',digest:e.digest('faq',fields),checked_at:new Date(now).toISOString(),archived:true};
 assert.equal(e.due(meta,'faq',fields,now+30*86400000),false);
 assert.equal(e.due(meta,'faq',['Changed answer'],now),true);
 const {card}=require('../src/lib/telegram-ops-advanced-card.cjs');
 const key='a'.repeat(24);
 const c=card({key,title:'سؤال',kind:'faq',body:'نص',refs:[],eligible:true,autoReady:false,index:0,total:1,full:true,preflight:{...meta,matched:0,total:1}});
 assert(c.text.includes('مؤرشف للمراجعة البشرية'));
 assert(c.text.includes('لم يجتز التحقق الآلي'));
 assert(c.inline_keyboard.flat().some(b=>b.callback_data==='approve:'+key));
});


test('review version covers routing, H1, structure and internal link targets',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const item={id:'editorial-1',kind:'guide',lang:'en',target:'example',slug:'example',risk_level:'low',h1_suggestion:'Original heading',internal_links:[{node_id:'packages',anchor:'Packages'}],sections:[{h2:'Section',body:'Original copy'}]};
 const fields=['Original title','Original copy','Packages'];
 const key=i=>e.digest('editorial',e.editorialIdentityFields(i,fields));
 for(const change of [{slug:'new-slug'},{h1_suggestion:'Changed heading'},{lang:'zh'},{risk_level:'high'},{internal_links:[{node_id:'investor-hub',anchor:'Packages'}]},{sections:[{h2:'Section',body:'Changed copy'}]},{related_service:'misa-license'}])assert.notEqual(key(item),key({...item,...change}));
 assert.equal(key(item),key({...item,review_preflight:{status:'ready'},updatedAt:'new timestamp',status:'approved'}));
});
test('bounded evidence batch gives both queues capacity and fills spare slots',()=>{
 const faq=Array.from({length:6},(_,i)=>({kind:'faq',item:{id:'f'+i}}));
 const ed=Array.from({length:6},(_,i)=>({kind:'editorial',item:{id:'e'+i}}));
 const {selectReviewBatch}=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 assert.deepEqual(selectReviewBatch([...faq,...ed]).map(x=>x.item.id),['f0','f1','e0','e1']);
 assert.deepEqual(selectReviewBatch([...faq,ed[0]]).map(x=>x.item.id),['f0','f1','e0','f2']);
 assert.equal(selectReviewBatch(ed).length,4);
 assert.equal(selectReviewBatch([]).length,0);
 const later={kind:'faq',item:{id:'late',review_preflight:{checked_at:'2026-11-25T00:00:00Z'}}};
 assert(!selectReviewBatch([later,...faq,...ed]).includes(later));
});


test('official FAQ discovery uses approved service topics even without search results',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const cases=[
  ['How should a foreign investor compare Saudi company formation support options?','company-formation','mc.gov.sa'],
  ['What should be checked before relying on a corporate bank account document checklist?','corporate-banking','rulebook.sama.gov.sa'],
  ['How can I check the current Saudi investment registration requirements before I apply?','misa-license','misa.gov.sa'],
  ['外国投资者在沙特设立公司前通常需要确认哪些事项？','company-formation','mc.gov.sa'],
  ['ما شروط فتح حساب بنكي للشركة؟','corporate-banking','rulebook.sama.gov.sa']
 ];
 for(const [q,topic,host] of cases){
  assert(e.faqTopicTargets(q).includes(topic),q);
  const urls=e.selectOfficialCandidates(e.faqTopicTargets(q),['https://competitor.example/'],[]);
  assert(urls.some(u=>new URL(u).hostname===host),q);
  assert(urls.length<=3);assert(urls.every(u=>e.safeUrl(u)===u));
  assert.equal(e.match(['Unsupported legal claim that must never be published'],urls.map(url=>({url,sentences:[]}))).complete,false);
 }
 assert.deepEqual(e.selectOfficialCandidates(e.faqTopicTargets('How is the weather?'),[],[]),[]);
});

test('automatic proof receipt rereads both approved authorities and binds every saved claim',async()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const a='This is a synthetic source sentence for automatic evidence testing';
 const b='A separate synthetic sentence establishes a second source fixture';
 const u='https://mc.gov.sa/en/Pages/Start-your-project.aspx',v='https://misa.gov.sa/activities/laws-regulations-copy/';
 const claims=[{claim:a,quote:a,url:u},{claim:b,quote:b,url:v}];
 const refs=[{kind:'official_candidate',url:u},{kind:'official_candidate',url:v}];
 let calls=0;
 const request=async(url,opts)=>{
  calls++;assert.equal(opts.redirect,'manual');
  return new Response('<p>'+(url===u?a:b)+'.</p>',{headers:{'content-type':'text/html'}});
 };
 const receipt=await e.liveProofReceipt([a,b],claims,refs,request);
 assert(receipt);assert.equal(calls,2);assert.deepEqual(receipt.urls,[u,v].sort());
 assert(receipt.proofs.every(p=>p.verified_by==='live_official_exact_quote'&&Number.isFinite(Date.parse(p.checked_at))));
 assert.equal(await e.liveProofReceipt([a,b+' unsupported'],claims,refs,request),null);
 assert.equal(await e.liveProofReceipt([a,b],claims.slice(0,1),refs,request),null);
 assert.equal(await e.liveProofReceipt([a,b],claims,refs.slice(0,1),request),null);
 assert.equal(await e.liveProofReceipt([a,b],claims,refs,async()=>new Response('<p>Unrelated source text.</p>',{headers:{'content-type':'text/html'}})),null);
 assert.equal(await e.liveProofReceipt([a,b],claims,refs,async()=>new Response('',{status:302,headers:{location:'https://example.com'}})),null);
});

test('editorial guide without a service slug can discover approved official topic sources',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const targets=['foreign-founder-checklist',...e.faqTopicTargets('How to prepare for company formation')];
 const urls=e.selectOfficialCandidates(targets,[],[]);
 assert(urls.some(u=>new URL(u).hostname==='mc.gov.sa'));
 assert(urls.length<=3);
 assert.deepEqual(e.selectOfficialCandidates(['unknown-slug',...e.faqTopicTargets('Unrelated topic')],[],[]),[]);
 const source=require('node:fs').readFileSync('src/lib/telegram-ops-advanced-evidence.ts','utf8');
 assert(source.includes("evidence.faqTopicTargets([title,x.item.primary_keyword||''].join(' '))"));
});
