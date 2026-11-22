"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {normalizeGeoBatch,persistGeoBatch}=require('../.geo-ingest-test-build/lib/geo-ingest.js');
(async()=>{
 assert.throws(()=>normalizeGeoBatch({opportunities:[{title:'x',type:'bad',score:55}]}),/Invalid opportunities/);
 assert.throws(()=>normalizeGeoBatch({drafts:[{q:'test',a:'text',risk_level:'wrong'}]}),/Invalid drafts/);
 assert.throws(()=>normalizeGeoBatch({drafts:[{q:'test',a:'text',risk_level:'high'},null]}),/Invalid drafts\[1\]: invalid_item/);
 assert.throws(()=>normalizeGeoBatch({drafts:[{q:'test',a:{private:'value'},risk_level:'high'}]}),/Invalid drafts\[0\]: invalid_answer/);
 const sample=normalizeGeoBatch({opportunities:[{title:'Source research',type:'gap',score:20}],goals:[{title:'Review original service guide',priority:'high'}],drafts:[{q:'What documents?',a:'Check directly with the authority.',risk_level:'high'}]});
 const calls={o:0,g:0,d:0,r:0};
 const success=await persistGeoBatch(sample,{
 saveOpportunity:async()=>{calls.o++}, saveGoal:async()=>{calls.g++},
 saveDrafts:async items=>{calls.d++;return items.length},saveReport:async()=>{calls.r++}
 });
 assert.equal(success.ok,true);assert.deepEqual(success.saved,{opportunities:1,goals:1,drafts:1,run_report:0,editorial_actions:0});
 const failed=await persistGeoBatch(sample,{
 saveOpportunity:async()=>{throw Error('RLS or schema error')},
 saveGoal:async()=>{},saveDrafts:async()=>0,saveReport:async()=>{}
 });
 assert.equal(failed.ok,false);assert.equal(failed.saved.opportunities,0);assert.equal(failed.saved.drafts,0);
 assert.equal(failed.errors.length,2);
 const provenance=normalizeGeoBatch({drafts:[{q:'What documents are needed to register a company in Saudi Arabia?',a:'The required documents vary by sector and investor type. Confirm current requirements directly with the competent Saudi authority before filing. An independent advisory firm cannot guarantee an official approval or reduce government fees.',risk_level:'high',evidence_ids:['disc_0'],evidence_refs:[{id:'disc_0',label:'Observed company registration guide',kind:'competitor_candidate',source:'search',url:'https://example.org/business-guide',observed_at:'2026-11-15T10:18:00Z'}]}]});
 assert.equal(provenance.drafts[0].evidence_refs[0].url,'https://example.org/business-guide');
 assert.equal(provenance.drafts[0].evidence_refs[0].kind,'competitor_candidate');
 assert.throws(()=>normalizeGeoBatch({drafts:[{q:'What are the Saudi business requirements?',a:'Review registration requirements and financial obligations with the appropriate Saudi government sources before beginning your application, and consult a qualified adviser regarding activities and paperwork.',risk_level:'high',evidence_refs:[{id:'x',label:'Bad source',kind:'web',source:'search',url:'javascript:alert(1)'}]}]}),/Invalid GEO evidence URL/);
 const code=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const admin=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
 assert(code.includes('const byId=new Map('),'evidence links must be matched with retrieved evidence, not fabricated');
 assert(admin.includes('مصادر الرصد المستخدمة'),'dashboard must display research provenance');
 const report=normalizeGeoBatch({run_report:{run_at:new Date().toISOString(),status:'partial',last_result:'drafts:partial'}});
 const reported=await persistGeoBatch(report,{saveOpportunity:async()=>{},saveGoal:async()=>{},saveDrafts:async()=>0,saveReport:async()=>{calls.r++}});
 assert.equal(reported.ok,true);assert.equal(reported.saved.run_report,1);

 const {assessGeoDraftCopy,validateGeoDrafts,splitGeoDraftReviewText}=require('../.geo-ingest-test-build/lib/geo-draft-quality.js');
 // The UI must never silently hide a whole middle sentence, or publish a
 // trailing procedural warning that was visually separated for review.
 const trailing='تختلف الشروط حسب النشاط والجهة المختصة؛ يجب التحقق من المصادر الرسمية قبل submission.';
 const parts=splitGeoDraftReviewText(trailing);
 assert.equal(parts.answer,'تختلف الشروط حسب النشاط والجهة المختصة','display only the substantive candidate answer');
 assert.equal(parts.note,'يجب التحقق من المصادر الرسمية قبل submission.','isolate only the precise trailing procedural note');
 const mid='يجب التحقق من المصادر الرسمية قبل submission، وقد تختلف المتطلبات حسب القطاع ويجب شرحها للمستثمر بوضوح.';
 assert.deepEqual(splitGeoDraftReviewText(mid),{answer:mid,note:''},'never truncate content in the middle of the answer');
 assert.deepEqual(splitGeoDraftReviewText('لا تتوفر معلومات رسمية كافية حاليًا.'),{answer:'لا تتوفر معلومات رسمية كافية حاليًا.',note:''},'ordinary information remains unchanged');
 assert.equal(splitGeoDraftReviewText('يجب التحقق من المصادر الرسمية قبل submission.').note,'','do not silently blank a standalone answer');
 const englishQ='How can a foreign investor open a company in Saudi Arabia?';
 const englishA='Start by identifying your proposed business activities and ownership structure. Check current eligibility, licensing and document requirements with the relevant Saudi authorities. Professional service charges must be quoted separately from government and third-party fees; authority approvals are not guaranteed.';
 const arQ='ما المستندات التي يحتاجها المستثمر لتأسيس شركة في السعودية؟';
 const arA='تختلف المستندات المطلوبة حسب النشاط وصفة المستثمر وطبيعة المنشأة المزمع تسجيلها. ابدأ بتحديد النشاط والشكل القانوني، ثم راجع المستندات والشروط الحالية في المصادر الرسمية للجهات المختصة. أتعاب المستشار منفصلة عن الرسوم الحكومية ولا توجد ضمانات مسبقة للموافقة.';
 const zhQ='外国投资者在沙特设立公司需要准备哪些资料？';
 const zhA='需要先确认投资者身份、企业经营活动和拟设立公司的结构，并根据主管部门现行要求核对申请资料及许可条件。服务机构的专业收费应当与政府费用和第三方费用分别列示。审批决定由沙特相关主管机关作出，任何咨询机构都无法保证一定获批。';
 for(const item of [[englishQ,englishA],[arQ,arA],[zhQ,zhA]]){
   const assessment=assessGeoDraftCopy(item[0],item[1]);
   assert.equal(assessment.publishable,true,JSON.stringify(assessment));
 }
 assert.equal(assessGeoDraftCopy(englishQ,'Observed competitor guides cover Saudi company formation for foreign investors, including registration, licensing, banking and residence-related topics. Requirements, approvals, fees and timelines are determined by official Saudi authorities; verify current rules with the relevant authorities before acting. This is commercial advisory information, not a government service or guarantee of approval.').publishable,false,'generic English filler');
 assert.equal(assessGeoDraftCopy('كيف يمكن ل investor أجنبي فتح شركة في Saudi Arabia؟','تشير صفحات competitors Observed إلى temas متعلقة بتأسيس الشركات في Saudi Arabia للمستثمرين الأجانب، بما في ذلك التسجيل والتراخيص والخدمات المصرفية وoptions الإقامة. تحدد Authorities Saudi الرسمية requirements and approvals and fees.').publishable,false,'mixed Arabic');
 assert.equal(assessGeoDraftCopy(zhQ,englishA).publishable,false,'English Chinese answer must be rejected');
 assert.throws(()=>validateGeoDrafts([{q:zhQ,a:englishA}]),/quality failed/);
 validateGeoDrafts([{q:englishQ,a:englishA},{q:arQ,a:arA},{q:zhQ,a:zhA}]);
 const dashboard=fs.readFileSync('src/app/admin/dashboard/page.tsx','utf8');
 const adminRoute=fs.readFileSync('src/app/api/admin/content/route.ts','utf8');
 assert(dashboard.includes('disabled={saving || !finalAssessment.publishable'),'invalid pending drafts cannot be approved in dashboard');
 assert(dashboard.includes('draftReviewEdits[draftReviewKey(existing)]??proposed.answer'),'final publish answer is an explicit operator review value');
 assert(dashboard.includes('a:reviewedAnswer,status:\'approved\''),'approved draft saves exactly the reviewed answer');
 assert(dashboard.includes('{q:draft.q,a:reviewedAnswer}'),'published FAQ matches the reviewed answer');
 assert(adminRoute.includes("assessGeoDraftCopy(incoming.q||'',answer)"),'final approved answer must be quality-checked server-side');
 assert(adminRoute.includes('Approved FAQ must exactly match the reviewed draft answer'),'server must reject mismatched published FAQ copy');
 assert(adminRoute.includes('Remove the procedural verification note from the final FAQ answer'),'server rejects procedural note in approved FAQ');

 const route=fs.readFileSync('src/app/api/geo/results/route.ts','utf8');
 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const store=fs.readFileSync('src/lib/content-store.ts','utf8');
 assert(!route.includes('/rest/v1/content_drafts'),'drafts stored in actual content_store, not nonexistent table');
 assert(route.includes('setContent({drafts:incoming})'));
 assert(store.includes("prior.status==='approved'||prior.status==='rejected'"),'must not requeue approved/rejected drafts');
 assert(runner.includes("process.exit(r.pipeline_ok ? 0 : 1)"),'CI job must fail on partial persistence');
 assert(runner.indexOf("'opencode/glm-5.3-flash-free'")>0 && runner.indexOf("'opencode/glm-5.3-flash-free'")<runner.indexOf("'opencode/deepseek-v4.1-flash-free'"),'Try the free GLM fallback before previously timed-out alternatives');
 assert(runner.includes("const replaySafe = stage==='opportunities' || stage==='editorial_actions'"),'Only deduplicated GEO stages may retry on ambiguous request failures');
 assert(runner.includes("const maxAttempts = replaySafe ? 3 : 1"),'GEO retries must be strictly bounded');
 assert(runner.includes("if(cleanNoData)return {records_processed:0,status:'success_no_data',error:null};"),
   'Only strictly validated empty editorial batches may be reported as success_no_data');
 assert(runner.includes("return {records_processed:0,status:'partial'"),
   'Rejected editorial candidates must continue to fail closed');
 assert(require('./geo-editorial-no-data-contract.cjs').publicationDecision({
   pipeline_ok:true,
   stages:Object.fromEntries(['discovery','evidence','geo_analysis','opportunities','goals','drafts','editorial_actions']
     .map(stage=>[stage,stage==='editorial_actions'?{status:'success_no_data',records_processed:0}:
       {status:'success',records_processed:1}]))
 })==='skip_no_data','Clean empty editorials never unlock W01 auto publication');

 assert(runner.includes('output.dashboard_synced=await updateGEOAgentRun(output)'));
 const {supportedSchemaSuggestions,promptForLocale}=require('./geo-opencode-planner.cjs');
 assert.deepEqual(supportedSchemaSuggestions(['WebPage','Offer','WebPage','Service']),['WebPage','Service'],'unsupported/duplicate model schemas never reach server');
 assert.deepEqual(supportedSchemaSuggestions(['Offer']),[],'unsupported schemas must not be misrepresented as a different valid schema');
 assert.equal(supportedSchemaSuggestions('Offer'),'Offer','malformed shapes still go through strict server validation');
 assert(promptForLocale('zh',[{id:'source-1',language:'zh',type:'keyword',source:'test'}]).includes('110 characters including at least 55 Han ideographs'),'prompt should prevent overly short Chinese FAQs');
 // Exercise the exact remote persistence function without external calls or secrets.
 const start=runner.indexOf('async function saveGEOStage(');
 const end=runner.indexOf('async function updateGEOAgentRun(',start);
 assert(start>=0&&end>start,'GEO persistence function must remain testable');
 const runMock=async response=>{
  const calls=[];
  const scope={process:{env:{GEO_API_URL:'https://example.invalid',GEO_API_KEY:'test-only'}},
   AbortSignal:{timeout:()=>undefined},console:{warn:()=>{}},
   fetch:async(_url,options)=>{const data=JSON.parse(options.body);calls.push(data);return response(data)}};
  vm.runInNewContext(runner.slice(start,end)+'\nthis.saveGEOStage=saveGEOStage;',scope);
  return {save:scope.saveGEOStage,calls};
 };
 const reply=(status,saved,errors)=>({ok:status===200,status,json:async()=>({ok:status===200,saved:{drafts:saved},errors})});
 const quality=await runMock(data=>data.drafts.length===2
   ?reply(502,0,['drafts: GEO draft quality failed: draft 2: Answer is too short to be a useful verified FAQ.'])
   :(data.drafts[0].q==='valid'?reply(200,1,[]):reply(502,0,['drafts: GEO draft quality failed: draft 1: Answer is too short to be a useful verified FAQ.'])));
 const partial=await quality.save('drafts',[{q:'valid'},{q:'short'}]);
 assert.equal(partial.status,'partial','invalid draft must keep stage visibly partial');
 assert.equal(partial.saved,1,'save other valid drafts on definitive quality rejection');
 assert.equal(quality.calls.length,3,'only definitive validation failure gets per-item fallback');
 const structural=await runMock(data=>data.drafts.length===2||data.drafts[0].q==='invalid'
   ?{status:422,ok:false,json:async()=>({ok:false,error:'Invalid drafts[0]: invalid_answer'})}
   :reply(200,1,[]));
 const split=await structural.save('drafts',[{q:'valid'},{q:'invalid'}]);
 assert.equal(split.status,'partial');
 assert.equal(split.saved,1,'the valid draft survives a definitive batch shape rejection');
 assert.match(split.error,/drafts_schema_invalid\/invalid_answer/);
 assert.equal(structural.calls.length,3);
 const storage=await runMock(()=>reply(502,0,['drafts: database unavailable']));
 const storageResult=await storage.save('drafts',[{q:'valid'},{q:'other'}]);
 assert.equal(storageResult.saved,0);
 assert.equal(storage.calls.length,1,'no retry of non-deduplicated drafts on storage failures');
 const acceptedPartial=await runMock(()=>reply(502,1,['drafts: GEO draft quality failed: unexpected acknowledgement']));
 const accepted=await acceptedPartial.save('drafts',[{q:'valid'},{q:'other'}]);
 assert.equal(accepted.saved,1);
 assert.equal(accepted.status,'partial');
 assert.equal(acceptedPartial.calls.length,1,'an acknowledged write cannot be replayed');
 const timeout=await runMock(()=>{throw new DOMException('PRIVATE_ERROR_TEXT','TimeoutError')});
 const unknown=await timeout.save('drafts',[{q:'valid'},{q:'other'}]);
 assert.equal(timeout.calls.length,1,'a timed-out request may have written data and cannot be replayed');
 assert.match(unknown.error,/request_timeout/);
 assert(!unknown.error.includes('PRIVATE_ERROR_TEXT'));
 // Each OpenCode attempt must start with isolated storage and a disposable workspace.
 const {createIsolatedGeoWorkspace}=require('./geo-opencode-runtime.cjs');
 const first=createIsolatedGeoWorkspace('Public Saudi investor-services GEO research A');
 const second=createIsolatedGeoWorkspace('Public Saudi investor-services GEO research B');
 try {
   assert.notEqual(first.workDir,second.workDir,'never reuse an old OpenCode session workspace');
   assert.notEqual(first.runtimeEnv.OPENCODE_DB,second.runtimeEnv.OPENCODE_DB,'session databases are unique per request');
   assert.equal(first.runtimeEnv.HOME,first.workDir,'each OpenCode process uses isolated HOME');
   assert(fs.existsSync(require('node:path').dirname(first.runtimeEnv.OPENCODE_DB)),'temporary SQLite parent directory exists');
   assert(first.runtimeEnv.XDG_CONFIG_HOME.startsWith(first.workDir),'global config is not reused');
   assert.notEqual(first.runtimeEnv.XDG_CONFIG_HOME,second.runtimeEnv.XDG_CONFIG_HOME,'each run has independent config');
   assert(first.workDir.startsWith(require('node:os').tmpdir()),'sessions are outside the repository');
   assert(fs.readFileSync(require('node:path').join(first.workDir,'AGENTS.md'),'utf8').includes('official-source evidence'),'each isolated session gets sourced research rules');
   const config=JSON.parse(fs.readFileSync(require('node:path').join(first.workDir,'opencode.json'),'utf8'));
   assert.equal(config.compaction.auto,true,'context compaction enabled');
   assert.equal(config.compaction.keep.tokens,4000,'keep summaries bounded');
   assert.equal(fs.readFileSync(require('node:path').join(first.workDir,'prompt.txt'),'utf8'),'Public Saudi investor-services GEO research A');
   assert(runner.includes("'opencode/big-pickle'"),'Big Pickle supported as an allowlisted free fallback');
   assert(runner.includes("FREE_MODEL_ALLOWLIST.includes(chosenModel)"),'non-allowlisted paid models must remain blocked');
   assert(runner.includes("const {workDir,runtimeEnv,cleanup}=createIsolatedGeoWorkspace(prompt)"),'new workspace per model attempt');
   assert(runner.includes('Object.assign(safeEnv,runtimeEnv)'), 'isolate session storage from user/global history');
   assert(runner.includes('const safeEnv={}'),'child environment is an explicit allowlist');
   assert(!runner.includes('...process.env'),'project secrets and global OpenCode settings are never forwarded wholesale');
   assert(runner.includes('} finally {\n      cleanup();'),'remove session data after each attempt, including errors');
   assert(runner.includes("'--standalone','--archived'"),'no shared session service');
   assert(runner.includes('execFileSync(OC_BIN,runArgs'),'spawn CLI directly without shell');
   assert(!runner.includes('execSync('),'no unsafe legacy CLI test sessions');
   assert(!runner.includes('--continue'), 'never continue a previous conversation');
 } finally {first.cleanup();second.cleanup();}
 assert(!fs.existsSync(first.workDir)&&!fs.existsSync(second.workDir),'disposable session directories are removed');
 console.log('PASS isolated OpenCode workspaces, temporary session cleanup, free Big Pickle and safe compaction');
 console.log('PASS verified GEO persistence, schema safeguards, draft quality fallback, and no ambiguous retries');
})().catch(e=>{console.error(e);process.exit(1)});
