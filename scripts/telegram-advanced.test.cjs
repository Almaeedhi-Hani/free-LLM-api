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

 test('risk assessment reclassifies independently supported neutral copy and preserves sensitive classification',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const ready={complete:true,matched:2,total:2};
 const item={status:'pending',risk_level:'low',q:'How can I find information on a website?'};
 const neutral=['A separate fictional source sentence for testing','Another fictional source sentence for testing'];
 assert.equal(e.assessPublicationRisk('faq',item,neutral,ready),'low');
 for(const q of ['What is the investment license fee?','ما متطلبات فتح حساب مصرفي؟','公司注册需要哪些文件？','How do I obtain a visa?'])assert.equal(e.assessPublicationRisk('faq',{...item,q},neutral,ready),'high');
 assert.equal(e.assessPublicationRisk('faq',{...item,risk_level:'high'},neutral,ready),'low');
 assert.equal(e.assessPublicationRisk('faq',item,neutral,{...ready,complete:false}),'high');
 assert.equal(e.assessPublicationRisk('editorial',{...item,target:'company-formation'},neutral,ready),'high');
 assert.equal(e.assessPublicationRisk('faq',item,['Unverified bank account details'],ready),'high');
 });

 test('technical tasks never consume official content review slots; exact duplicates do not crowd out distinct content',()=>{
 const {selectReviewBatch}=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const faq={kind:'faq',item:{q:'Same exact question',a:'Same exact answer',risk_level:'high'}};
 const changed={kind:'faq',item:{...faq.item,a:'A materially different answer'}};
 const technical=['technical_seo','internal_link'].map(kind=>({kind:'editorial',item:{kind,id:kind}}));
 const guide={kind:'editorial',item:{kind:'guide',lang:'en',target:'guide-one',title:'Guide title',body:'Guide body',risk_level:'high'}};
 const other={kind:'editorial',item:{...guide.item,target:'guide-two'}};
 const result=selectReviewBatch([...technical,faq,{...faq,item:{...faq.item}},changed,guide,{...guide,item:{...guide.item}},other]);
 assert.deepEqual(result,[faq,changed,guide,other]);
 assert.equal(selectReviewBatch(technical).length,0);
 });

test('semantic shadow contract binds trilingual claim coverage to source passages and content version',()=>{
 const {prepare,prompt,compare}=require('../src/lib/geo-semantic-review.cjs');
 const pages=[{url:'https://mc.gov.sa/en/Pages/Start-your-project.aspx',sentences:['Synthetic test: review available information before deciding.']},{url:'https://misa.gov.sa/activities/laws-regulations-copy/',sentences:['Synthetic test: check the information before making a decision.']}];
 for(const [locale,claim] of [['ar','راجع المعلومات المتاحة قبل اتخاذ القرار'],['en','Review the available information before deciding'],['zh','作出决定之前，请先核实可用信息']]){
  const p=prepare({kind:'faq',locale,versionDigest:'a'.repeat(64),context:'Synthetic fixture question',fields:[claim],pages});
  assert(p);assert(prompt(p).includes(claim));
  const review=(provider,passage_ids)=>({provider,model:'synthetic-fixture',response:{packetDigest:p.packetDigest,assessments:[{claim_id:'c0',verdict:'supported',fidelity:'faithful',passage_ids}]}});
  const a=review('fixture-a',['s0p0']),b=review('fixture-b',['s1p0']);
  assert.equal(compare(p,[a,b]).status,'shadow_consensus');
  assert.equal(compare(p,[a,b]).publicationAuthorized,false);
  assert.equal(compare(p,[a,{...b,provider:a.provider}]).status,'blocked');
  assert.equal(compare(p,[a,review('fixture-b',['s0p0'])]).status,'blocked');
  assert.equal(compare(p,[a,review('fixture-b',['invented'])]).status,'blocked');
  assert.equal(compare({...p,context:'changed'},[a,b]).status,'blocked');
  assert.equal(compare(p,[a,{...b,response:{...b.response,packetDigest:'b'.repeat(64)}}]).status,'blocked');
  for(const bad of [{verdict:'unsupported'},{verdict:'uncertain'},{fidelity:'unfaithful'},{fidelity:'uncertain'}]){
   assert.equal(compare(p,[a,{...b,response:{...b.response,assessments:[{...b.response.assessments[0],...bad}]}}]).status,'blocked');
  }
  assert.equal(compare(p,[a,{...b,response:{...b.response,assessments:[]}}]).status,'blocked');
 }
 const base={kind:'faq',locale:'en',versionDigest:'a'.repeat(64),context:'Synthetic fixture',fields:['Synthetic claim'],pages};
 assert.equal(prepare({...base,pages:pages.slice(0,1)}),null);
 assert.equal(prepare({...base,pages:[pages[0],{...pages[1],url:'https://example.com/'}]}),null);
 assert.equal(prepare({...base,fields:Array.from({length:21},(_,i)=>'Claim '+i)}),null);
});

 test('publication diagnostics share the production version gate and avoid stale sensitive permission claims',()=>{
 const fs=require('node:fs');
 const runner=fs.readFileSync('src/lib/geo/publication/runner.ts','utf8');
 const gate=fs.readFileSync('src/lib/telegram-ops-advanced-evidence.ts','utf8');
 const dry=runner.slice(runner.indexOf(' if(dryRun){'),runner.indexOf(' // A legacy RPC'));
 assert(dry.includes('autoPublicationBlockReason')&&dry.includes('ready_for_live_probe:readyForProbe'));
 assert(!dry.includes('liveAutoPublicationReceipt')&&!dry.includes('restCall('));
 assert(gate.includes("if(x.item.risk_level!=='low'&&!allowHighRisk)return 'sensitive_publication_disabled'"));
 assert(gate.includes('return autoPublicationBlockReason(x,allowHighRisk)===null'));
 assert(runner.includes('verifier.canProbeAutoPublication')&&runner.includes('verifier.liveAutoPublicationReceipt'));
 const ui=fs.readFileSync('src/components/admin/impact/PublicationControls.tsx','utf8');
 assert(!ui.includes('دون اشتراط مصدرين')&&!ui.includes('لا يلزم مصدران'));
 assert(ui.includes('الكتالوج المعتمد')&&ui.includes('changeSensitive(!autoStatus?.allow_high_risk)'));
 });

 test('changed official topic mapping rechecks historical no-candidate records once within the existing batch',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const meta={status:'blocked',reason:'no_official_candidates',checked_at:new Date().toISOString()};
 const recovered=['How should a foreign investor compare Saudi company formation support options?','What should be checked before relying on a corporate bank account document checklist?','外国投资者在沙特设立公司前通常需要确认哪些事项？'].map(q=>({kind:'faq',item:{q,a:'Fixture answer',risk_level:'high',review_preflight:meta}}));
 assert(recovered.every(e.discoveryRepairDue));
 const x=recovered[0];
 for(const patch of [{source_discovery_version:e.SOURCE_DISCOVERY_VERSION},{archived:true},{reason:'exact_claim_coverage_incomplete'},{status:'ready'}])assert.equal(e.discoveryRepairDue({...x,item:{...x.item,review_preflight:{...meta,...patch}}}),false);
 assert.equal(e.discoveryRepairDue({...x,item:{...x.item,q:'Unrelated weather question'}}),false);
 const unrelated={kind:'faq',item:{q:'Are professional package fees the same as Saudi government fees?',a:'Fixture',review_preflight:meta}};
 assert.equal(e.discoveryRepairDue(unrelated),false);
 const technical={kind:'editorial',item:{kind:'technical_seo',target:'company-formation',review_preflight:meta}};
 assert.equal(e.discoveryRepairDue(technical),false);
 const fresh=Array.from({length:8},(_,i)=>({kind:i<4?'faq':'editorial',item:{id:'new'+i}}));
 const selected=e.selectReviewBatch([...fresh,...recovered]);
 assert.equal(selected.length,4);assert(selected.includes(recovered[0])&&selected.includes(recovered[1]));
 assert.equal(selected.filter(x=>x.kind==='editorial').length,2);
 const source=require('node:fs').readFileSync('src/lib/telegram-ops-advanced-evidence.ts','utf8');
 assert(source.includes('evidence.discoveryRepairDue(x)||evidence.due('));
 assert(source.includes('source_discovery_version:evidence.SOURCE_DISCOVERY_VERSION'));
 });

 test('real candidate shadow remains distinct from publication proof and is bounded to one existing review tick',()=>{
 const fs=require('node:fs');
 const worker=fs.readFileSync('src/lib/telegram-ops-advanced-evidence.ts','utf8');
 const gate=worker.slice(worker.indexOf('export function autoPublicationBlockReason'),worker.indexOf('// Existing signed tick'));
 assert(!gate.includes('semantic_shadow'));
 assert(worker.includes('const index=checked.findIndex')&&worker.includes('process.env.OPENROUTER_API_KEY'));
 assert(worker.includes('if(r.requests>0)meta.semantic_shadow='));
 assert(worker.includes('publication_authorized:false,independent_gateway_verified:false'));
 assert(worker.includes('shadowIdentity(i.review_preflight?.semantic_shadow)'));
 assert(worker.includes('prior?.semantic_shadow?.version_digest===meta.digest'));
 });

 test('evidence routing separates real historical planning, commercial, mixed, and legal items without granting publication',()=>{
 const {classify}=require('../src/lib/geo-evidence-lanes.cjs');
 const f=(q,a)=>classify('faq',{q},[a]);
 assert.equal(classify('editorial',{kind:'home',title:'Homepage decision support for Saudi market entry'},['The homepage should act as a decision hub rather than a brochure.']),'implementation');
 assert.equal(classify('editorial',{kind:'packages',title:'Price-explanation content for /packages'},['The /packages page should make professional scope and fee boundaries explicit.']),'implementation');
 assert.equal(classify('editorial',{kind:'technical_seo'},['Improve page metadata']),'implementation');
 assert.equal(f('What is our package scope?','Ask for a written scope and service deliverables.'),'commercial');
 assert.equal(f('Are professional package fees the same as Saudi government fees?','Professional service fees and statutory charges are separate.'),'mixed');
 assert.equal(f('What should be checked before relying on a corporate bank account document checklist?','Confirm ownership and signatory documents with the bank.'),'regulatory');
 assert.equal(f('外国投资者在沙特设立公司前通常需要确认哪些事项？','请核实银行开户和投资登记要求。'),'regulatory');
 assert.equal(f('ما نطاق الباقة؟','تواصل معنا لمعرفة نطاق الخدمة.'),'commercial');
 assert.equal(f('服务套餐价格是否包含政府规费和第三方支出？','专业服务费与政府规费分列。'),'mixed');
 assert.equal(f('Is it sunny?','Check the forecast.'),'unknown');
 const fs=require('node:fs'),worker=fs.readFileSync('src/lib/telegram-ops-advanced-evidence.ts','utf8');
 assert(worker.includes("if(lane==='implementation')"));
 assert(worker.indexOf("if(lane==='implementation')")<worker.indexOf("const urls=allowed&&lane!=='commercial'&&!catalogComplete?"));
 assert(worker.includes('evidence.matchPublication')&&worker.includes('first_party_catalog'));
 assert(worker.includes('catalogFor(candidate)'));
 assert(worker.includes("if(x.item.risk_level!=='low'&&!allowHighRisk)return 'sensitive_publication_disabled'"));
 });

test('routed exact proof: catalog scope, one official authority, mixed sources, no unsupported claims',async()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 const own='https://free-llm-api-1-didl.onrender.com/en/packages',url='https://mc.gov.sa/en/Pages/Start-your-project.aspx';
 const catalog={url:own,sentences:['Investor status and activity review','Authority fees, sector licences and residency are excluded']};
 const law='A synthetic regulation sentence for testing the approved official evidence route';
 const pages=[{url,sentences:[law]}],scope=catalog.sentences[0];
 const first=e.matchPublication([scope],[],'commercial',catalog);assert(first.complete);assert.equal(first.proofs[0].url,own);
 assert(!e.matchPublication([scope],[],'regulatory',catalog).complete);
 assert(!e.matchPublication([scope+' and guaranteed approval'],[],'commercial',catalog).complete);
 assert(e.matchPublication([law],pages,'regulatory',catalog).complete);
 const mixed=e.matchPublication([scope,law],pages,'mixed',catalog);assert(mixed.complete);
 const refs=[{kind:'first_party_catalog',url:own},{kind:'official_candidate',url}];
 const fetcher=async()=>new Response('<p>'+law+'.</p>',{headers:{'content-type':'text/html'}});
 const receipt=await e.livePublicationReceipt([scope,law],mixed.proofs,refs,'mixed',catalog,fetcher);
 assert(receipt);assert(receipt.proofs.some(p=>p.verified_by==='first_party_catalog_exact'));assert(receipt.proofs.some(p=>p.verified_by==='live_official_exact_quote'));
 assert.equal(await e.livePublicationReceipt([scope,law],mixed.proofs,refs,'mixed',{...catalog,sentences:[]},fetcher),null);
 assert.equal(await e.livePublicationReceipt([scope,law],mixed.proofs,refs,'mixed',catalog,async()=>new Response('<p>Changed source</p>',{headers:{'content-type':'text/html'}})),null);
});

test('backlog repair preserves default cap and adds bounded balanced batch',()=>{const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');const rows=Array.from({length:24},(_,i)=>({kind:i<12?'faq':'editorial',item:{id:'i'+i}}));assert.equal(e.selectReviewBatch(rows,12).length,12);assert.equal(e.selectReviewBatch(rows,99).length,12);assert.equal(e.selectReviewBatch(rows,12).filter(x=>x.kind==='faq').length,6);});
test('model repairs are proposals only, bounded and source anchored',()=>{const r=require('../src/lib/geo-backlog-repair.cjs');assert.equal(r.snippets('investment registration',[{url:'https://example.gov.sa',sentences:['Investment registration information','x'.repeat(451)]}]).length,1);assert.equal(r.proposals([{data:{goals:[{slot:0,q:'valid'},{slot:0,q:'duplicate'},{slot:8,q:'invalid'}]}}],1).length,1);assert(r.prompt([]).includes('exact sentence'));});

test('backlog reserves blocked capacity, prioritizes catalog repair, keeps fresh work and cooldown',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs'),r=require('../src/lib/geo-backlog-repair.cjs');
 const now=Date.parse('2026-11-26T09:00:00Z'), old=new Date(now-4*3600000).toISOString();
 const blocked=Array.from({length:8},(_,i)=>({kind:i<4?'faq':'editorial',item:{id:'old'+i,review_preflight:{status:'blocked',reason:'exact_claim_coverage_incomplete',checked_at:old}}}));
 const fresh=Array.from({length:20},(_,i)=>({kind:i<10?'faq':'editorial',item:{id:'fresh'+i}}));
 const chosen=r.selectBacklogBatch([...fresh,...blocked],e.selectReviewBatch,x=>r.repairDue(x.item.review_preflight,now),x=>x.item.id==='old3');
 assert.equal(chosen.length,12);assert(chosen.includes(blocked[3]));assert.equal(chosen.slice(0,4).filter(x=>blocked.includes(x)).length,4);assert(chosen.some(x=>fresh.includes(x)));
 assert(!r.repairDue({...blocked[0].item.review_preflight,checked_at:new Date(now-1000).toISOString()},now));
 assert(!r.repairDue({...blocked[0].item.review_preflight,repair_version:r.VERSION},now));
 assert(!r.repairDue({...blocked[0].item.review_preflight,archived:true},now));
 assert(!r.repairDue({...blocked[0].item.review_preflight,reason:'policy_unavailable_or_excluded'},now));
});
test('known fee-boundary FAQ uses actual deployed disclosure and remains exact-proof gated',async()=>{
 const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
 const load=(path,req)=>{const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,require:req});return m.exports;};
 const offers=load('src/lib/package-offers.ts',require);
 const c=load('src/lib/geo-publication-catalog.ts',p=>{assert.equal(p,'./package-offers');return offers;});
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs'),lanes=require('../src/lib/geo-evidence-lanes.cjs');
 const q='Are professional package fees the same as Saudi government fees?';
 const answer=c.catalogFeeFaqAnswer(q,'en');assert.equal(answer,offers.packageDisclosure.en);
 assert.equal(c.catalogFeeFaqAnswer(q,'ar'),null);assert.equal(c.catalogFeeFaqAnswer('What is the Saudi government fee?','en'),null);
 const catalog=c.catalogProofPage('en'),lane=lanes.classify('faq',{q},[answer]);assert.equal(lane,'mixed');
 const result=e.matchPublication([answer],[],lane,catalog);assert(result.complete);assert(result.proofs.every(p=>p.url===catalog.url));
 const refs=[{url:catalog.url,kind:'first_party_catalog'}];const receipt=await e.livePublicationReceipt([answer],result.proofs,refs,lane,catalog,()=>assert.fail('catalog proof needs no external request'));
 assert(receipt);assert(!e.matchPublication([answer+' Guaranteed approval.'],[],lane,catalog).complete);
 assert.equal(await e.livePublicationReceipt([answer],result.proofs,refs,lane,{...catalog,sentences:[]},()=>assert.fail()),null);
 const quality=load('src/lib/geo-draft-quality.ts',require);assert(quality.assessGeoDraftCopy(q,answer).publishable);
 const worker=fs.readFileSync('src/lib/telegram-ops-advanced-evidence.ts','utf8');
 assert(worker.includes('autoPublicationBlockReason(verified,true)===null')&&worker.includes('reviewContentPolicy(x)'));
 assert(fs.readFileSync('src/lib/telegram-ops-advanced.ts','utf8').includes('review_preflight.archived===true'));
 const central=fs.readFileSync('src/app/api/cron-central/route.ts','utf8');assert(central.includes("if(task==='master')await review"));
 const master=fs.readFileSync('.github/workflows/v3-production-orchestrator.yml','utf8');assert(master.includes('publication_owned_by_master: true'));
 assert(fs.readFileSync('.github/workflows/geo-analysis.yml','utf8').includes('!inputs.publication_owned_by_master'));
});
test('backlog priority keeps research but prevents new visitor proposals above capacity',()=>{
 const fs=require('node:fs');
 const worker=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 assert(worker.includes('backlog_pending>=12')&&worker.includes('result.deferred_backlog')&&worker.includes('result.drafts=[];result.editorial_actions=technical'));
 assert(worker.includes('const repair=direct&&!backlogPriority'));
});

test('official topic recovery recognizes observed register-a-company and foreign investment questions',()=>{
 const e=require('../src/lib/telegram-ops-advanced-evidence.cjs');
 for(const q of ['What are the primary requirements for a foreign investor to register a company in Saudi Arabia?','What are the steps to register a company in Saudi Arabia?','Company registration in Saudi Arabia']){
  const topics=e.faqTopicTargets(q);
  assert(topics.includes('company-formation'));
  assert(e.selectOfficialCandidates(topics,[],[]).length>0);
 }
 assert(e.faqTopicTargets('沙特外商投资制度的主要特点是什么？').includes('misa-license'));
 assert(!e.faqTopicTargets('What are the steps to register a bicycle?').includes('company-formation'));
 assert.equal(e.SOURCE_DISCOVERY_VERSION,'manifest-topic-recovery-v2');
});
test('source-less candidates cannot consume the four existing repair slots',()=>{
 const r=require('../src/lib/geo-backlog-repair.cjs');
 const row=(i,kind,available)=>({i,entry:{kind,excerpts:available?[{url:'https://mc.gov.sa/',text:'Fixture source sentence'}]:[]}});
 const inputs=[null,row(0,'faq',false),row(1,'editorial',false),row(2,'faq',false),row(3,'editorial',false),row(4,'faq',true),row(5,'faq',true),row(6,'editorial',true),row(7,'editorial',true),row(8,'faq',true)];
 assert.deepEqual(r.sourceReadySlots(inputs).map(x=>x.i),[4,5,6,7]);
 assert.deepEqual(r.sourceReadySlots(inputs,2).map(x=>x.i),[4,6]);
 assert.equal(r.sourceReadySlots(inputs.filter(x=>x?.entry.kind==='faq')).length,3);
 assert.equal(r.sourceReadySlots([null,row(0,'faq',false)]).length,0);
 assert.equal(r.repairInputStatus([],false),'no_source_backed_repair');
 assert.equal(r.repairInputStatus([inputs[5]],false),'repair_credential_missing');
 assert.equal(r.repairInputStatus([inputs[5]],true),'repair_inputs_ready');
});
