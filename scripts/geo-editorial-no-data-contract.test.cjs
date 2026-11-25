'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const contract=require('./geo-editorial-no-data-contract.cjs');
const guard=require('./geo-generated-output-guard.cjs');
(async()=>{
 const {STAGES,cleanEditorialNoData,completeGeoPipeline,publicationDecision}=contract;
 const base=Object.fromEntries(STAGES.map(id=>[id,{status:'success',records_processed:1}]));
 const noData={...base,editorial_actions:{status:'success_no_data',records_processed:0}};
 assert.equal(cleanEditorialNoData({generated:[]}),true);
 assert.equal(cleanEditorialNoData({generated:[],rejected:1}),false);
 assert.equal(cleanEditorialNoData({generated:[],rejected:1,repaired:1}),false);
 assert.equal(cleanEditorialNoData({generated:[],screenedRejected:1}),false);
 assert.equal(completeGeoPipeline(noData),true);
 assert.equal(publicationDecision({pipeline_ok:true,stages:noData}),'skip_no_data');
 assert.equal(publicationDecision({pipeline_ok:true,stages:base}),'ready');
 assert.equal(publicationDecision({pipeline_ok:false,stages:noData}),'blocked');
 assert.equal(publicationDecision({pipeline_ok:true,stages:{...noData,drafts:{status:'partial'}}}),'blocked');
 assert.equal(publicationDecision({pipeline_ok:true,stages:{...noData,editorial_actions:{status:'success_no_data',records_processed:1}}}),'blocked');
 assert.equal(publicationDecision({pipeline_ok:true,stages:{...noData,ghost:{status:'success'}}}),'blocked');
 assert.equal(publicationDecision({pipeline_ok:true,stages:null}),'blocked');

 const partial={...base,editorial_actions:{status:'partial',records_processed:1,validation_only:true}};
 assert.equal(contract.classifyGeoOutcome(base),'success');
 assert.equal(contract.classifyGeoOutcome(noData),'success');
 assert.equal(contract.classifyGeoOutcome(partial),'partial_success');
 assert.equal(contract.classifyGeoOutcome({...partial,editorial_actions:{status:'partial'}}),'failed');
 assert.equal(contract.classifyGeoOutcome({...partial,drafts:{status:'partial'}}),'failed');
 assert.equal(contract.classifyGeoOutcome({...partial,evidence:{status:'blocked'}}),'blocked');
 assert.equal(contract.classifyGeoOutcome({}),'failed');
 assert.equal(publicationDecision({pipeline_ok:true,stages:partial}),'blocked');
 const source=fs.readFileSync('scripts/opencode-geo-analysis.js','utf8');
 const start=source.indexOf('async function stageEditorialActions()');
 const end=source.indexOf('\n// --- Main pipeline ---',start);
 assert(start>=0&&end>start,'extract actual editorial handler without network');
 const step=source.slice(start,end)+'\nthis.handleEditorial=stageEditorialActions;';
 let persistCalls=0,savedItems=[];
 function fixture(generated,validation={rejected:0,repaired:0}){
  const scope={
   stageResults:{
    geo_analysis:{editorial_actions:generated,validation:{editorial_actions:validation}},
    evidence:{items:[]}},
   console:{log:()=>{},warn:()=>{}},
   require:p=>{
    if(p==='./geo-generated-output-guard.cjs')return guard;
    if(p==='./geo-editorial-no-data-contract.cjs')return contract;
    if(p==='node:crypto')return require('node:crypto');
    throw Error('Unexpected dependency '+p);
   },
   saveGEOStage:async(name,items)=>{
    assert.equal(name,'editorial_actions');
    persistCalls++;
    savedItems=items;
    return {status:'success',saved:items.length};
   },
   supportedSchemaSuggestions:x=>x
  };
  vm.runInNewContext(step,scope);
  return scope;
 }
 // The exact W01 production incident had zero generated editorial proposals,
 // but the other analysis stages successfully saved legitimate research.
 const clean=fixture([]);
 const result=await clean.handleEditorial();
 assert.equal(result.status,'success_no_data');
 assert.equal(result.records_processed,0);
 assert.equal(result.error,null);
 assert.equal(clean.stageResults.editorial_actions.no_data,true);
 assert.equal(clean.stageResults.editorial_actions.persisted,0);
 assert.equal(persistCalls,0,'empty editorial must not write invented proposals');

 const invalid=fixture([{kind:'unapproved_kind',lang:'en',title:'fake'}]);
 const bad=await invalid.handleEditorial();
 assert.equal(bad.validation_only,true);
 assert.equal(bad.status,'partial','a rejected model suggestion cannot pass as no-data');
 assert.equal(invalid.stageResults.editorial_actions.no_data,false);
 assert.equal(persistCalls,0);
 const failedLocale=fixture([],{rejected:1,repaired:0});
 assert.equal((await failedLocale.handleEditorial()).status,'partial',
   'unrepaired malformed editorial item must fail closed');
 const recoveredButNonempty=fixture([],{rejected:1,repaired:1});
 assert.equal((await recoveredButNonempty.handleEditorial()).status,'partial',
   'prior rejected/repaired item must not silently become clean no-data');

 const legit={kind:'service',lang:'en',target:'misa-license',
  title:'Planning a responsible investment service guide',
  summary:'A research-based proposal requiring human review of investment details.',
  body:'This proposal is for human review; authoritative source evidence is required before publication. '.repeat(4),
  evidence_ids:[]};
 const valid=fixture([legit]);
 assert.equal((await valid.handleEditorial()).status,'success');
 assert.equal(persistCalls,1,'existing valid proposal must still be persisted');
 assert.equal(savedItems[0].status,'pending','never autoapprove editorial proposals');
 assert.equal(savedItems[0].risk_level,'high','conservative risk unchanged');

 // Execute the actual workflow classification command with a temporary artifact.
 const os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'geo-workflow-'));
 try {
  fs.mkdirSync(path.join(tmp,'market-intel'));
  fs.mkdirSync(path.join(tmp,'scripts'));
  fs.copyFileSync('scripts/geo-editorial-no-data-contract.cjs',path.join(tmp,'scripts/geo-editorial-no-data-contract.cjs'));
  const workflow=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
  const command=workflow.split('\n').find(line=>line.includes('node -e')&&line.includes('execution_outcome='));
  assert(command,'actual workflow classification command');
  for(const [report,expected] of [[{dashboard_synced:true,stages:partial},'partial_success'],[{dashboard_synced:false,stages:partial},'failed']]){
   fs.writeFileSync(path.join(tmp,'market-intel/geo-persisted-results.json'),JSON.stringify(report));
   const output=path.join(tmp,'output');
   fs.writeFileSync(output,'');
   cp.execSync(command.trim(),{cwd:tmp,env:{...process.env,GITHUB_OUTPUT:output}});
   assert.equal(fs.readFileSync(output,'utf8'),'execution_outcome='+expected+'\n');
  }
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
 const wf=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
 assert(wf.includes('node scripts/geo-editorial-no-data-contract.cjs --decision market-intel/geo-persisted-results.json'));
 assert(wf.includes('if [ "$decision" = "skip_no_data" ]; then'));
 assert(wf.includes('exit 0')&&wf.includes('Guarded automatic publication after a successful GEO cycle'));
 assert(wf.includes('x-geo-source-workflow: W01'),'existing authenticated W01 publish route preserved');
 assert(source.includes("output.pipeline_ok=require('./geo-editorial-no-data-contract.cjs').completeGeoPipeline(results)"));
 assert(source.includes("require('./geo-editorial-no-data-contract.cjs').completeGeoPipeline(outcome.stages)"));
 assert(source.includes("no_data:stageResults.editorial_actions?.no_data===true"));
 console.log('PASS W01 clean no-editorial research success_no_data; publication SKIP; rejected still partial, no invented content or changes to human review');
})().catch(e=>{console.error(e);process.exitCode=1});
