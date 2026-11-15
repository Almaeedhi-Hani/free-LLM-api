"use strict";
const assert=require('node:assert/strict');
const {validateEditorialItem,validateEditorialBatch,approvedEditorial,publicGuide}=require('../.editorial-test-build/lib/editorial-workflow.js');
const {validateContentTree,topicRelatedLiveNodes}=require('../.editorial-test-build/lib/content-tree.js');
const tree=validateContentTree();assert.equal(tree.nodes,18);assert.equal(tree.live,9);assert.equal(tree.planned,9);
assert(topicRelatedLiveNodes('company-documents').some(n=>n.id==='company-formation'));
assert(!topicRelatedLiveNodes('company-formation').some(n=>n.id==='company-documents'),'planned guide must not receive broken links');
const now='2026-11-15T10:00:00Z';
const base={id:'ed-123456789a',kind:'service',lang:'ar',target:'company-formation',title:'كيف تحدد المسار الأنسب لتأسيس الشركة؟',summary:'مراجعة النشاط والشركاء والجهات المعنية قبل اختيار باقة تنفيذ مناسبة.',body:'يتطلب اختيار المسار المناسب دراسة النشاط ونوع الكيان وصفة المستثمر ومراحل تأسيسه. يجب مراجعة الوثائق والاشتراطات الحالية مع الجهة الرسمية المختصة قبل تقديم الطلب. وتفصل أتعاب المستشار عن الرسوم الحكومية والتكاليف التي تفرضها الجهات الأخرى. يساعد التخطيط المسبق على تحديد نطاق العمل بصورة واقعية دون تقديم ضمان بالموافقة.',risk_level:'high',status:'pending',createdAt:now,evidence_ids:[],evidence_refs:[]};
const draft=validateEditorialItem(base);
assert.equal(approvedEditorial([draft],'ar').length,0,'pending content never renders');
const approved={...draft,status:'approved',reviewedAt:now,verified_sources:['https://misa.gov.sa/frequently-asked-questions/']};
assert.equal(approvedEditorial([approved],'ar','service','company-formation').length,1);
assert.equal(approvedEditorial([approved],'en').length,0,'locale isolation');
// Reproduce failures observed in GEO run 43716242173: model emits route and
// content-tree IDs, while the public page uses canonical service slugs.
const routed=validateEditorialItem({...base,target:'/services/company-formation',topic_node_id:'company-formation'});
assert.equal(routed.target,'company-formation');
const misa=validateEditorialItem({...base,target:'/services/misa-license',topic_node_id:'misa-registration'});
assert.equal(misa.target,'misa-license');
const banking=validateEditorialItem({...base,target:'banking',topic_node_id:'banking'});
assert.equal(banking.target,'corporate-banking');
assert.throws(()=>validateEditorialItem({...base,target:'/services/nonexistent-service'}),/Unknown service/);
assert.throws(()=>validateEditorialItem({...base,target:'/services/misa-license',topic_node_id:'company-formation'}),/mismatch/);
assert.throws(()=>validateEditorialItem({...approved,target:'/admin/dashboard'}),/Unknown service/);
assert.throws(()=>validateEditorialItem({...approved,verified_sources:['javascript:alert(1)']}),/HTTPS/);
const guide={...approved,id:'ed-guide-1234',kind:'guide',target:'foreign-investor-preparation',slug:'foreign-investor-preparation',related_service:'company-formation'};
assert.equal(publicGuide([guide],'ar','foreign-investor-preparation').id,'ed-guide-1234');
assert.throws(()=>validateEditorialItem({...guide,related_service:'invented-service'}),/Invalid related service/);
const bankingGuide=validateEditorialItem({...guide,related_service:'banking',topic_node_id:'banking-kyc'});
assert.equal(bankingGuide.related_service,'corporate-banking');
const bankRouteGuide=validateEditorialItem({...guide,related_service:'/services/corporate-banking'});
assert.equal(bankRouteGuide.related_service,'corporate-banking');
assert.equal(publicGuide([guide],'zh','foreign-investor-preparation'),undefined);
assert.throws(()=>validateEditorialItem({...guide,topic_node_id:'unknown-topic'}),/Unknown topic node/);
assert.throws(()=>validateEditorialItem({...guide,internal_links:[{node_id:'company-documents',anchor:'Documents preparation'}]}),/existing live/);
validateEditorialItem({...guide,topic_node_id:'company-documents',primary_keyword:'Saudi company incorporation documents',secondary_keywords:['foreign investor paperwork'],sections:[{h2:'Prepare official records',body:'Start by identifying activity, ownership and the proposed company structure. Consult current documentation requirements with the relevant official authority before applying. Professional fees should be displayed separately from statutory and third-party charges.'}],internal_links:[{node_id:'company-formation',anchor:'Company formation in Saudi Arabia'}],schema_suggestions:['Article','BreadcrumbList']});
assert.throws(()=>validateEditorialItem({...approved,kind:'technical_seo',target:'/'}),/never published/);
assert.throws(()=>validateEditorialBatch([approved,approved]),/Duplicate editorial ID/);
// Regression: real 2026-11-15 zh proposals were rejected despite substantive ideographic prose.
const chinese={...base,lang:'zh',
 title:'沙特投资登记与公司设立前的准备事项',
 summary:'帮助投资者了解公司登记前的资料范围，并说明不同活动应向官方机构核实的条件与收费。',
 body:'投资者应当先明确拟开展的商业活动、股东结构和拟设立的法律实体。某些行业可能需要其他主管机构批准。申请前需核查最新官方指南，并整理公司与股东的资料。专业咨询费与政府收费必须分别说明，顾问不得保证审批结果。投资者还应按实际情况核查银行尽职调查要求。',
 sections:[{h2:'材料清单',body:'需要根据投资者身份、行业与公司形式核实文件材料，不能将示例视为官方固定要求。',
  subsections:[{h3:'官方要求',body:'提交前应到主管机关获取当前材料清单，并区分政府收费与咨询服务费用。'}]}]};
assert.equal(validateEditorialItem(chinese).lang,'zh');
assert.equal(approvedEditorial([validateEditorialItem(chinese)],'zh').length,0,'Chinese drafts remain unpublished');
assert.throws(()=>validateEditorialItem({...chinese,body:'仅供参考。'}),/substantive/,'extremely short Chinese body still rejected');
assert.throws(()=>validateEditorialItem({...chinese,sections:[{h2:'资料',body:'过短'}]}),/H2\/H3/,'extremely short Chinese section still rejected');
assert.throws(()=>validateEditorialItem({...chinese,lang:'en'}),/H2\/H3/,'English retains stricter section lengths');
const fs=require('node:fs');
const worker=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
assert(worker.includes('stageEditorialActions'),'GEO produces editorial proposals beyond FAQ');
assert(worker.includes("persisted_editorial_actions"),'persisted counters measured, not inferred');
console.log('PASS diverse editorial review types, placement, locale, source review and publication gating');
