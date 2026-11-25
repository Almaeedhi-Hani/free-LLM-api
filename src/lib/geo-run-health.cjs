'use strict';
// The persisted run report is authoritative; unrelated content edits cannot
// refresh GEO. Only the closed, server-generated trailing classification token
// is parsed. Never convert an inconsistent or incomplete report to success.
function geoRunOutcome(agent){
 if(!agent||!['success','error','partial'].includes(agent.status))return null;
 const match=/(?:^| \| )execution_outcome=(success|partial_success|failed|blocked)$/.exec(String(agent.lastResult||''));
 if(!match)return agent.status==='success'?'unknown':'failed';
 const outcome=match[1];
 if((outcome==='success')!==(agent.status==='success'))return 'unknown';
 return outcome;
}
function geoReadback(agent){
 const outcome=geoRunOutcome(agent),stamp=agent?.lastRun;
 if(!outcome||outcome==='unknown'||typeof stamp!=='string'||!Number.isFinite(Date.parse(stamp)))return {status:'unknown',note:'geo_run_report_unverified'};
 return {status:'observed',source:'content_store',latestTimestamp:stamp,runOutcome:outcome};
}
function radarReadback(row){
 const stamp=row?.finished_at;
 if(!row||typeof stamp!=='string'||!Number.isFinite(Date.parse(stamp)))return {status:'unknown',note:'radar_run_report_unverified'};
 const status=row.status==='success'?'success':['failed','error','failure'].includes(row.status)?'failed':row.status==='partial'?'partial_success':null;
 if(!status)return {status:'unknown',note:'radar_run_report_unverified'};
 return {status:'observed',source:'analysis_runs',latestTimestamp:stamp,runOutcome:status};
}
module.exports={geoRunOutcome,geoReadback,radarReadback};
