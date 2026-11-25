'use strict';
const fs=require('node:fs');
const {fixtures,buildPrompt,assess}=require('./geo-semantic-review-smoke.cjs');
const {account,runReviews}=require('../src/lib/geo-openrouter-review.cjs');
async function run(opts={}){
 const cases=fixtures();
 return runReviews({...opts,prompt:buildPrompt(cases),assessResults:results=>{
  const result=assess(cases,results);
  return {status:result.status==='synthetic_pass'?'openrouter_shadow_pass':'blocked',reason:result.status,passed:result.passed,total:result.total};
 }});
}
if(require.main===module)run().then(report=>{
 fs.mkdirSync('market-intel',{recursive:true});fs.writeFileSync('market-intel/openrouter-account-benchmark.json',JSON.stringify(report,null,2));
 console.log('[OPENROUTER_ACCOUNT_BENCHMARK]',JSON.stringify(report));
 if(report.status!=='openrouter_shadow_pass')process.exitCode=1;
}).catch(()=>{console.error('openrouter_benchmark_failed');process.exitCode=1;});
module.exports={account,run};
