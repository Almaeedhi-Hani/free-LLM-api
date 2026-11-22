'use strict';
/**
 * W01: a genuinely empty editorial proposal batch is NOT a rejected proposal.
 * This only classifies verified empty data; it never weakens validation or
 * grants publication. W03 keeps its independent approved-publication schedule.
 */
const STAGES=Object.freeze(['discovery','evidence','geo_analysis','opportunities',
  'goals','drafts','editorial_actions']);

function cleanEditorialNoData({generated,rejected=0,repaired=0,screenedRejected=0}={}){
 return Array.isArray(generated)&&generated.length===0&&
   rejected===0&&repaired===0&&screenedRejected===0;
}
function completeGeoPipeline(stages){
 if(!stages||typeof stages!=='object'||Array.isArray(stages)||
   Object.keys(stages).length!==STAGES.length)return false;
 return STAGES.every(id=>{
  const stage=stages[id];
  return stage&&typeof stage==='object'&&
    (stage.status==='success'||(id==='editorial_actions'&&
      stage.status==='success_no_data'&&stage.records_processed===0));
 });
}
function publicationDecision(report){
 if(!report||report.pipeline_ok!==true||!completeGeoPipeline(report.stages))
   return 'blocked';
 const editorial=report.stages.editorial_actions;
 if(editorial.status==='success_no_data')return 'skip_no_data';
 if(editorial.status==='success')return 'ready';
 return 'blocked';
}
if(require.main===module){
 // Only a short decision token is printed, never the report's raw evidence.
 try{
  if(process.argv[2]!=='--decision'||process.argv.length!==4)
   throw Error('invalid_mode');
  const fs=require('node:fs');
  const report=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
  const decision=publicationDecision(report);
  process.stdout.write(decision+'\n');
  if(decision==='blocked')process.exitCode=1;
 }catch{
  process.stdout.write('blocked\n');
  process.exitCode=1;
 }
}
module.exports={STAGES,cleanEditorialNoData,completeGeoPipeline,publicationDecision};
