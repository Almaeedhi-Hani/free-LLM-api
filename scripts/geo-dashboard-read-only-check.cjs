'use strict';
const base='https://free-llm-api-1-didl.onrender.com';
(async()=>{
 if(!process.env.CRON_SECRET){console.log('DASHBOARD_READBACK',{status:'blocked',reason:'missing_secret'});process.exitCode=1;return}
 const endpoints=['/api/admin/market/competitors','/api/admin/market/keywords'];
 const report=[];
 for(const path of endpoints){
  const r=await fetch(base+path,{headers:{'x-admin-secret':process.env.CRON_SECRET},signal:AbortSignal.timeout(16000)});
  let data=null;try{data=await r.json()}catch{}
  const k=path.includes('competitors')?'competitors':'keywords';
  const rows=Array.isArray(data?.[k])?data[k]:[];
  report.push({name:k,http_status:r.status,returned:rows.length,
    candidate_present:k==='competitors'?rows.some(x=>x.domain==='arabianhorizon.com.sa'):null});
 }
 console.log('DASHBOARD_LIVE_READBACK',JSON.stringify(report));
 if(report.some(x=>x.http_status!==200)||!report[0].candidate_present)process.exitCode=1;
})().catch(e=>{console.log('DASHBOARD_LIVE_READBACK',JSON.stringify({status:'error',error:e?.name||'network'}));process.exitCode=1});
