'use strict';
// A central-tagged dispatch is evidence of the configured workflow source,
// not proof of a GitHub native schedule or a cryptographic attestation.
const CENTRAL_INTERVAL_MS=3*3600000,CENTRAL_GRACE_MS=4*3600000;
function centralRun(run,kind){
 if(!run||run.event!=='workflow_dispatch'||run.head_branch!=='main'||!['master','W04'].includes(kind))return false;
 const match=/^Supabase central (master|W04) (\d{4}-\d{2}-\d{2}T\d{2}:00:00Z)$/.exec(run.display_title||'');
 if(!match||match[1]!==kind||!Number.isSafeInteger(run.id)||run.id<1)return false;
 const slot=Date.parse(match[2]),created=Date.parse(run.created_at||'');
 if(!Number.isFinite(slot)||new Date(slot).toISOString()!==match[2].replace('Z','.000Z')||new Date(slot).getUTCHours()%3!==0||!Number.isFinite(created))return false;
 return created>=slot&&created-slot<=15*60000;
}
function centralState(runs,now,kind){
 if(!Array.isArray(runs)||!Number.isFinite(now))return {status:'unknown',reason:'central_run_read_unavailable'};
 const latest=runs.filter(r=>centralRun(r,kind)).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
 if(!latest)return {status:'stale',reason:'no_central_tagged_dispatch',runId:null};
 const age=now-Date.parse(latest.created_at),info={runId:latest.id,createdAt:latest.created_at,ageMinutes:Math.round(age/60000),ageHours:+(age/3600000).toFixed(2)};
 if(age<0)return {status:'unknown',reason:'invalid_timestamp',...info};
 if(age>CENTRAL_GRACE_MS)return {status:'stale',reason:'central_dispatch_overdue',...info};
 if(['queued','waiting','in_progress','requested','pending'].includes(latest.status))return {status:'pending',reason:'central_run_in_progress',...info};
 if(latest.status==='completed'&&latest.conclusion==='success')return {status:'healthy',reason:'central_tagged_dispatch_success',...info};
 if(latest.status==='completed'&&['failure','cancelled','timed_out','action_required','startup_failure'].includes(latest.conclusion))return {status:'failed',reason:'central_dispatch_failed',...info};
 return {status:'unknown',reason:'central_result_unverified',...info};
}
function gscCoverage(record,now){
 const n=typeof now==='number'?now:Date.parse(now||''),stamp=Date.parse(record?.checked_at||'');
 const day=record?.metric_date,date=Date.parse(day+'T00:00:00Z');
 if(!Number.isFinite(n)||!Number.isFinite(stamp)||stamp>n+300000||typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==day)return {state:'unknown',when:null};
 const today=new Date(n);today.setUTCHours(0,0,0,0);
 const eligible=today.getTime()-3*86400000;
 const when=new Date(stamp).toISOString();
 if(date>eligible)return {state:'unknown',when};
 if(record.status==='failed')return {state:'failed',when};
 if(!['success_with_data','success_no_data'].includes(record.status))return {state:'unknown',when};
 if(date===eligible)return {state:'recent',when};
 // A new eligible day appears at UTC midnight; allow two central ticks.
 if(date===eligible-86400000&&n-today.getTime()<6*3600000)return {state:'pending',when};
 return {state:'stale',when};
}
module.exports={CENTRAL_INTERVAL_MS,CENTRAL_GRACE_MS,centralRun,centralState,gscCoverage};
