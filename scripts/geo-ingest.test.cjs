"use strict";
const assert=require('node:assert/strict');
const {normalizeGeoBatch,persistGeoBatch}=require('../.geo-ingest-test-build/geo-ingest.js');
(async()=>{
 assert.throws(()=>normalizeGeoBatch({opportunities:[{title:'x',type:'bad',score:55}]}),/Invalid opportunities/);
 assert.throws(()=>normalizeGeoBatch({drafts:[{q:'test',a:'text',risk_level:'wrong'}]}),/Invalid drafts/);
 const sample=normalizeGeoBatch({opportunities:[{title:'Source research',type:'gap',score:20}],goals:[{title:'Review original service guide',priority:'high'}],drafts:[{q:'What documents?',a:'Check directly with the authority.',risk_level:'high'}]});
 const calls={o:0,g:0,d:0,r:0};
 const success=await persistGeoBatch(sample,{
 saveOpportunity:async()=>{calls.o++}, saveGoal:async()=>{calls.g++},
 saveDrafts:async items=>{calls.d++;return items.length},saveReport:async()=>{calls.r++}
 });
 assert.equal(success.ok,true);assert.deepEqual(success.saved,{opportunities:1,goals:1,drafts:1,run_report:0});
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
 const fs=require('node:fs');
 const {assessGeoDraftCopy,validateGeoDrafts}=require('../.geo-ingest-test-build/geo-draft-quality.js');
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
 assert(dashboard.includes('disabled={saving || !assessGeoDraftCopy(d.q,d.a).publishable}'),'invalid pending drafts cannot be approved in dashboard');
 assert(adminRoute.includes("assessGeoDraftCopy(incoming.q||'',incoming.a||'')"),'approval must be checked server-side');

 const route=fs.readFileSync('src/app/api/geo/results/route.ts','utf8');
 const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const store=fs.readFileSync('src/lib/content-store.ts','utf8');
 assert(!route.includes('/rest/v1/content_drafts'),'drafts stored in actual content_store, not nonexistent table');
 assert(route.includes('setContent({drafts:incoming})'));
 assert(store.includes("prior.status==='approved'||prior.status==='rejected'"),'must not requeue approved/rejected drafts');
 assert(runner.includes("process.exit(r.pipeline_ok ? 0 : 1)"),'CI job must fail on partial persistence');
 assert(runner.includes('output.dashboard_synced=await updateGEOAgentRun(output)'));
 console.log('PASS verified GEO persistence counts, dashboard syncing, failed writes, no nonexistent tables or silent job success');
})().catch(e=>{console.error(e);process.exit(1)});
