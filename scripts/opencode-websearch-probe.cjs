'use strict';
// Bounded, read-only search capability probe; NO production writes, secrets, or publishing.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const dir=path.resolve('.search-probe');fs.mkdirSync(dir,{recursive:true});
const report={checked_at:new Date().toISOString(),model:'opencode/beam-free',status:'unverified',
 tool_used:false,websearch_completed:false,source_links:[],error:null};
const input=[
'Read-only diagnostic run. You MUST use the websearch tool exactly once to search:',
'Saudi Arabia MISA license company formation investor service providers',
'Do not use shell, edit, write, or other tools. Do not claim any competitors without source URLs.',
'If websearch is unavailable, report unavailable without fabricating results.',
'Return a short JSON answer including source URLs, if search succeeded.'
].join('\n');
fs.writeFileSync(path.join(dir,'websearch-prompt.txt'),input);
const bin=process.env.OPENCODE_BIN||'/home/runner/.opencode/bin/opencode';
try{
 const filteredEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(KEY|SECRET|TOKEN|PASSWORD|SERVICE_ROLE)/i.test(k)));
 const output=cp.execFileSync(bin,['run','--standalone','--archived','--format','json','--model','opencode/beam-free','--file','websearch-prompt.txt','Use the attached instructions.'],{
  cwd:dir,env:filteredEnv,encoding:'utf8',timeout:85000,maxBuffer:5*1024*1024
 });
 for(const line of output.split(/\r?\n/)){
  let e;try{e=JSON.parse(line)}catch{continue}
  const p=e.part||{};
  if((e.type==='tool_use'||e.type==='tool')&&String(p.tool||e.tool)==='websearch'){
   report.tool_used=true;
   if(p.state?.status==='completed'){
    report.websearch_completed=true;
    const content=String(p.state?.output||'').slice(0,30000);
    const urls=content.match(/https?:\/\/[^\s<>")\]}]+/g)||[];
    report.source_links=[...new Set(urls)].slice(0,8);
   }
  }
 }
 report.status=report.websearch_completed&&report.source_links.length?'verified_search':
  report.tool_used?'tool_called_without_confirmed_results':'provider_unavailable_or_tool_not_called';
}catch(e){
 report.status='model_or_provider_error';
 report.error=(e?.name||'Error')+': '+String(e?.message||'').slice(0,180);
}
fs.writeFileSync(path.join(dir,'opencode-websearch-report.json'),JSON.stringify(report,null,2));
console.log('OPENCODE_SEARCH_DIAGNOSTIC',JSON.stringify(report));
