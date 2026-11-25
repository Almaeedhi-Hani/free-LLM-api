"use strict";
const assert=require('node:assert/strict');
const {validateEditorialItem,validateEditorialBatch,approvedEditorial,publicGuide,officialSourceCandidates,editorialPublicationIssues}=require('../.editorial-test-build/lib/editorial-workflow.js');
const {validateContentTree,topicRelatedLiveNodes,suggestInternalLinks}=require('../.editorial-test-build/lib/content-tree.js');
const tree=validateContentTree();assert.equal(tree.nodes,18);assert.equal(tree.live,9);assert.equal(tree.planned,9);
assert(topicRelatedLiveNodes('company-documents').some(n=>n.id==='company-formation'));
assert(!topicRelatedLiveNodes('company-formation').some(n=>n.id==='company-documents'),'planned guide must not receive broken links');
const now='2026-11-15T10:00:00Z';
const misaLinks=suggestInternalLinks('misa-registration','en');
assert(misaLinks.length>0,'MISA has useful related live destinations');
assert(misaLinks.some(x=>x.node_id==='company-formation'),'Related company formation service linked');
assert(misaLinks.every(x=>x.route&&x.route!=='/insights'&&x.route!=='/services/misa-license'),'No self, planned or empty hub links');
assert.equal(new Set(misaLinks.map(x=>x.route)).size,misaLinks.length,'No duplicate link destinations');
assert(suggestInternalLinks('misa-registration','ar').some(x=>/[\u0600-\u06ff]/.test(x.anchor)),'Arabic anchors are localized');
assert(suggestInternalLinks('misa-registration','zh').some(x=>/[\u3400-\u9fff]/.test(x.anchor)),'Chinese anchors are localized');
assert.deepEqual(suggestInternalLinks('unknown-topic','en'),[],'Unknown topics produce no links');

assert(editorialPublicationIssues({kind:'service',body:'This service page should explain the advisory scope and authority boundaries.'}).length,'planning instructions blocked');
assert(editorialPublicationIssues({kind:'service',body:'Investors should check the applicable investment requirements with the responsible authority before preparing their application.'}).length===0,'visitor copy remains eligible');
assert(editorialPublicationIssues({kind:'service',body:'Service overview.',sections:[{h2:'Requirements',body:'Describe the practical support an advisory team can provide.'}]}).length,'section instructions blocked');
assert(editorialPublicationIssues({kind:'internal_link',body:'Any text'}).length,'SEO tasks not publishable');

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
// Real 2026-11-15 model output used concise but meaningful Chinese titles,
 // H1 suggestions and short natural anchors, which must remain pending for review.
const zhReal={...chinese,kind:'home',target:'/',topic_node_id:'investor-hub',
 title:'首页中文决策支持',h1_suggestion:'沙特市场进入决策支持',
 internal_links:[{node_id:'packages',anchor:'服务套餐'}]};
assert.equal(validateEditorialItem(zhReal).title,'首页中文决策支持');
assert.equal(approvedEditorial([validateEditorialItem(zhReal)],'zh').length,0);
assert.throws(()=>validateEditorialItem({...zhReal,title:'简短标题'}),/substantive/,'three-four-character title remains too short');
assert.throws(()=>validateEditorialItem({...zhReal,h1_suggestion:'短标题'}),/H1/,'three-character H1 remains too short');
assert.throws(()=>validateEditorialItem({...zhReal,internal_links:[{node_id:'packages',anchor:'费用'}]}),/Internal links/,'two-character anchor remains too short');
assert.throws(()=>validateEditorialItem({...zhReal,lang:'en'}),/substantive/,'English title minimum remains unchanged');
// Automatic candidate detection never equates competitor pages with official evidence.
const refs=[
 {id:'o1',label:'Saudi official portal',source:'search',kind:'official_candidate',url:'https://misa.gov.sa/en/'},
 {id:'o2',label:'Duplicate official portal',source:'search',kind:'official_candidate',url:'https://misa.gov.sa/en/'},
 {id:'x1',label:'Competitor',source:'exa',kind:'competitor_candidate',url:'https://example.com/saudi-startup'},
 {id:'x2',label:'Spoofed domain',source:'search',kind:'competitor_candidate',url:'https://misa.gov.sa.evil.example/path'},
 {id:'x3',label:'Non-government',source:'search',kind:'competitor_candidate',url:'https://cma.org.sa/'},
 {id:'x4',label:'Bad protocol',source:'search',kind:'keyword',url:'http://misa.gov.sa/en/'},
 {id:'x5',label:'Credentials in URL',source:'search',kind:'keyword',url:'https://user:pass@misa.gov.sa/en/'},
 {id:'x6',label:'Unexpected port',source:'search',kind:'keyword',url:'https://misa.gov.sa:444/en/'}
];
assert.deepEqual(officialSourceCandidates(refs),['https://misa.gov.sa/en/']);
assert.deepEqual(officialSourceCandidates([{id:'c',label:'Competitor page',source:'exa',kind:'competitor_candidate',url:'https://commercial.example.com'}]),[],'competitor observations do not become official');
assert.deepEqual(officialSourceCandidates(undefined),[],'missing research evidence blocks automatic source approval');

assert(editorialPublicationIssues({kind:'home',body:'The homepage should orient investors toward service pages.'}).length,'homepage planning copy cannot publish');
assert(editorialPublicationIssues({kind:'packages',body:'Package content should state what is included and excluded.'}).length,'package planning copy cannot publish');
assert(editorialPublicationIssues({kind:'guide',body:'This guide should help investors compare company registration routes.'}).length,'guide writing instructions cannot publish');
assert.equal(editorialPublicationIssues({kind:'guide',body:'Investors can review the available routes and compare required preparation documents with the relevant authority.'}).length,0,'normal reader-facing copy remains publishable');

const fs=require('node:fs');
const reviewPanelSource=fs.readFileSync('src/components/EditorialReviewPanel.tsx','utf8');
assert(reviewPanelSource.includes('const authorityTarget=item.related_service||item.target;'), 'guide and comparison official source searches use their validated service authority rather than the unpublished guide slug');
assert(reviewPanelSource.includes("const verified=(reviewedSources[item.id]||[]).filter(url=>official.includes(url))"),'approval only uses explicitly selected official candidate URLs');
assert(reviewPanelSource.includes('editorialPublicationIssues(item)'), 'UI refuses instruction-like content before approval');
const editorialBlockSource=fs.readFileSync('src/components/EditorialBlock.tsx','utf8');
assert(editorialBlockSource.includes("route==='/services/'+target"),'published service editorial avoids self-link');
assert(editorialBlockSource.includes("all.findIndex(other=>other.node_id===link.node_id)"),'published editorial deduplicates link targets');
assert(editorialBlockSource.includes("route==='/insights'"),'guide hub is gated until published guides exist');

const worker=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
assert(worker.includes('stageEditorialActions'),'GEO produces editorial proposals beyond FAQ');
assert(worker.includes("persisted_editorial_actions"),'persisted counters measured, not inferred');
console.log('PASS diverse editorial review types, placement, locale, source review and publication gating');

// Recent real multilingual failure shapes: every visible surface is checked.
for(const marker of ['مقترح تحريري','ملاحظات داخلية','编辑提案','内部备注','editorial proposal','retain the current layout']){
 for(const field of ['title','summary','body'])assert(editorialPublicationIssues({kind:'guide',body:'Useful investor text.',[field]:marker}).length,field+' '+marker);
 assert(editorialPublicationIssues({kind:'guide',body:'Useful investor text.',sections:[{h2:marker,body:'Useful copy.'}]}).length);
 assert(editorialPublicationIssues({kind:'guide',body:'Useful investor text.',sections:[{h2:'Overview',body:'Useful copy.',subsections:[{h3:marker,body:'Useful copy.'}]}]}).length);
 assert(editorialPublicationIssues({kind:'guide',body:'Useful investor text.',internal_links:[{node_id:'packages',anchor:marker}]}).length);
}
