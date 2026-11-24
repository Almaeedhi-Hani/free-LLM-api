'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {prepareGoals,screenEditorial,eligibleEditorial,screenDrafts,draftQualityReason}=require('./geo-generated-output-guard.cjs');
const candidateGoals=[
 {title:'Improve foreign-investor formation guidance',evidence_ids:['disc_0']},
 {title:'Compare Saudi service package scopes',priority:'high'},
 {title:'研究沙特外资公司注册所需文件与步骤',description:'收集政府和行业组织有关注册流程的公开资料。'},
 {title:' ',priority:'high'},
 {title:'<script>alert(1)</script>',priority:'low'}
];
const goal=prepareGoals(candidateGoals);
assert.equal(goal.accepted.length,3);
assert.equal(goal.defaulted,2,'unspecified model priority has a neutral explicit default');
assert(goal.accepted.every(g=>['medium','high','low'].includes(g.priority)));
assert.deepEqual(goal.accepted.map(g=>g.priority),['medium','high','medium']);
assert.equal(goal.rejected.length,2,'reject malformed or HTML goals instead of making up text');
const editorial=[
 {kind:'page',lang:'ar',target:'مقال',topic_node_id:'obs_fake',title:'عنوان حقيقي لمقال الاستثمار',
  summary:'مراجعة المسار القانوني لتأسيس النشاط بحسب الجهة المختصة.',body:'x'.repeat(170)},
 {kind:'article',lang:'en',target:'investor-hub',topic_node_id:'investor-hub',
  title:'A guide for foreign investment setup',summary:'A practical overview of the current documented application route.',
  body:'x'.repeat(170)},
 {kind:'guide',lang:'en',target:'non-existing-claims',slug:'another-slug',
  title:'A guide for foreign investment setup',summary:'A practical overview of current documented application routes.',
  body:'x'.repeat(170)},
 {kind:'service',lang:'en',target:'misa-license',topic_node_id:'misa-registration',
  title:'Review the foreign investment registration steps',
  summary:'Review the documented scope and required filings for the selected activity.',
  body:'Research-based service information for investors seeking company formation in Saudi Arabia. Specific activity requirements remain subject to official review.',
  evidence_ids:['disc_0']},
];
const checked=screenEditorial(editorial);
assert.equal(checked.accepted.length,1,'only a real service target is accepted');
assert.equal(checked.accepted[0].risk_level,'high','absence of risk metadata defaults to high, never low');
assert.deepEqual(checked.rejected.map(x=>x.reason),['unknown_kind','unknown_kind','invalid_guide_slug']);
assert.equal(eligibleEditorial({...editorial[3],target:'unknown'}),'unknown_service_target');
assert.equal(eligibleEditorial({...editorial[3],topic_node_id:'obs_fake'}),'unknown_topic_node');
assert.equal(eligibleEditorial({...editorial[3],kind:'home',target:'/'}),'wrong_home_target');
assert(!checked.accepted.some(x=>x.kind==='page'||x.kind==='article'));
// Guide aliases are deterministic, not a relaxation of the canonical validator.
const guide={...editorial[2],target:'investor-guide',slug:'investor-guide',evidence_ids:['disc_0']};
for(const input of [{...guide,target:'Investor Guide',slug:'investor_guide'},{...guide,target:' /insights/Investor--Guide ',slug:'INVESTOR-GUIDE'},{...guide,slug:undefined},{...guide,target:undefined},{...guide,target:'/insights/investor-guide'},{...guide,slug:'/insights/investor-guide'}]){
 const result=screenEditorial([input],'en');
 assert.equal(result.rejected.length,0);
 assert.equal(result.accepted[0].target,'investor-guide');
 assert.equal(result.accepted[0].slug,'investor-guide');
 assert.equal(eligibleEditorial(result.accepted[0]),null);
 assert.deepEqual(result.accepted[0].evidence_ids,guide.evidence_ids);
}
for(const input of [{...guide,target:'investor-guide?x=1'},{...guide,target:'investor%2Dguide'},{...guide,target:'investor guide',slug:'other guide'},{...guide,target:'investor/guide'},{...guide,slug:'other-guide'},{...guide,slug:'https://example.org/insights/investor-guide'},{...guide,target:'دليل'},{...guide,target:'../investor-guide'},{...guide,target:undefined,slug:undefined},{...guide,target:'a'.repeat(91),slug:undefined}]){
 assert.equal(screenEditorial([input],'en').accepted.length,0,'Reject ambiguous, invalid or invented routes');
}
// Synthetic multilingual preflight cases: no model/search calls and no DB writes.
const enQ='Which source documents should an investor verify before company registration?';
const enA='Before choosing an application route, review the proposed business activity, confirm document identity and validity, and obtain current requirements from the responsible Saudi authority. The team must distinguish official fees from professional advisory costs.';
const arQ='ما المستندات التي يجب التحقق منها قبل تسجيل الشركة الاستثمارية في السعودية؟';
const arA='يجب مراجعة النشاط المقترح والتحقق من صحة مستندات المستثمر وصلاحيتها، ثم الرجوع إلى التعليمات الرسمية الحالية لدى الجهة المختصة قبل اختيار مسار التسجيل. ينبغي الفصل بوضوح بين الرسوم الحكومية وأتعاب الخدمات المهنية وعدم افتراض صدور الموافقة.';
const zhQ='外资企业在注册前应该核实哪些正式文件与费用？';
const zhA='在选择注册途径之前，投资者应当核对企业经营活动和投资者身份资料，确认文件是否有效，并向负责的沙特主管部门查询现行要求。咨询服务费用与政府规定的费用需要分别核实，不能根据一般介绍推断许可获批或者审批时间。';
for(const [q,a] of [[enQ,enA],[arQ,arA],[zhQ,zhA]]){
 assert.equal(draftQualityReason(q,a),null,'complete language-specific FAQ must pass the local server-aligned copy guard');
}
const draftCheck=screenDrafts([
 {q:enQ,a:enA},{q:arQ,a:arA},{q:zhQ,a:zhA},
 {q:'Short?',a:enA},
 {q:enQ,a:'too short'},
 {q:enQ,a:'Observed competitor guides '.repeat(8)},
 {q:enQ,a:'Guaranteed approval. '.repeat(10)},
 {q:'Which official source should an overseas investor verify first?',a:enA}
]);
assert.equal(draftCheck.accepted.length,3,'accept three nonduplicated, language-valid FAQs');
assert.deepEqual(draftCheck.rejected.map(x=>x.reason),[
 'question_too_short','answer_too_short','generic_competitor_filler','unverified_guarantee','duplicate_answer'
]);
const serverQuality=fs.readFileSync('src/lib/geo-draft-quality.ts','utf8');
for(const invariant of ['question.length<15','ques.total<8','answer.length<90','res.total<55',
 'ques.arRatio<0.65','res.ar<45','res.arRatio<0.72','ques.zhRatio<0.55',
 'res.zh<35','res.zhRatio<0.48','ques.enRatio<0.85','res.en<50','res.enRatio<0.85']){
 assert(serverQuality.includes(invariant),'local draft-quality preflight must not drift from the server: '+invariant);
}
assert(draftQualityReason(enQ,enA+' guaranteed approval')==='unverified_guarantee');

const workflow=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
const planner=fs.readFileSync('scripts/geo-opencode-planner.cjs','utf8');
assert(workflow.includes('GEO_LLM_MODE: direct'));
assert(runner.includes("require('./geo-generated-output-guard.cjs').prepareGoals"));
assert(runner.includes("require('./geo-generated-output-guard.cjs').screenEditorial"));
assert(planner.includes('Never omit priority')&&planner.includes('NEVER use page or article'));
assert(planner.includes('Never use a research evidence ID as topic_node_id'));
assert(planner.includes('return editorial_actions:[]'));
assert(planner.includes('FAQ QUALITY PREFLIGHT'),'direct-model prompt must expose unchanged server draft quality rules');
console.log('PASS actual-production-schema regressions: required priorities, real editorial kinds/routes, no invented identity');
