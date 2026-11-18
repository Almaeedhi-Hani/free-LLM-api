'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {prepareGoals,screenEditorial,eligibleEditorial}=require('./geo-generated-output-guard.cjs');
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
const workflow=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
const runner=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
const planner=fs.readFileSync('scripts/geo-opencode-planner.cjs','utf8');
assert(workflow.includes('GEO_LLM_MODE: direct'));
assert(runner.includes("require('./geo-generated-output-guard.cjs').prepareGoals"));
assert(runner.includes("require('./geo-generated-output-guard.cjs').screenEditorial"));
assert(planner.includes('Never omit priority')&&planner.includes('NEVER use page or article'));
assert(planner.includes('Never use a research evidence ID as topic_node_id'));
assert(planner.includes('return editorial_actions:[]'));
console.log('PASS actual-production-schema regressions: required priorities, real editorial kinds/routes, no invented identity');
