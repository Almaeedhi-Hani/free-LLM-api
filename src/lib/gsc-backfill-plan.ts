/**
 * Data-driven GSC catch-up planning, with injected UTC clock and no network/DB writes.
 * Historical zero-row responses must be persisted as success_no_data by a separate
 * approved storage integration; a missing DB row alone cannot establish failure.
 */
export type GscSyncDayState='success_with_data'|'success_no_data'|'failed';
export type GscSyncDayRecord={
  metric_date:string;status:GscSyncDayState;checked_at:string;rows_fetched:number;attempts:number;
};
export type GscCatchupReason='missing'|'retry_failed'|'recheck_no_data';
export type GscCatchupTarget={date:string;reason:GscCatchupReason;prior_attempts:number};
export type GscBackfillPlan={eligible_through:string;targets:GscCatchupTarget[];pending:number;examined:number};
function isoDay(input:string):number{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input))throw Error('invalid_day');
  const stamp=Date.parse(input+'T00:00:00.000Z');
  if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==input)
    throw Error('invalid_day');
  return stamp;
}
function dayString(timestamp:number):string{return new Date(timestamp).toISOString().slice(0,10)}
const DAY=86_400_000;
export function planGscCatchup(input:{
  now:Date;earliestDate:string;history:GscSyncDayRecord[];maxDays?:number;lookbackDays?:number;
}):GscBackfillPlan{
  if(!(input.now instanceof Date)||!Number.isFinite(input.now.getTime()))
    throw Error('invalid_clock');
  const maxDays=input.maxDays===undefined?7:input.maxDays;
  const lookbackDays=input.lookbackDays===undefined?45:input.lookbackDays;
  if(!Number.isInteger(maxDays)||maxDays<1||maxDays>10||
     !Number.isInteger(lookbackDays)||lookbackDays<3||lookbackDays>90)
    throw Error('invalid_budget');
  // Search Console recent performance can be incomplete; never query today -1/-2.
  const today=isoDay(input.now.toISOString().slice(0,10));
  const latest=today-3*DAY;
  const earliest=Math.max(isoDay(input.earliestDate),today-lookbackDays*DAY);
  const history=new Map<string,GscSyncDayRecord>();
  for(const row of input.history){
    if(!row||!['success_with_data','success_no_data','failed'].includes(row.status)||
       !Number.isSafeInteger(row.rows_fetched)||row.rows_fetched<0||
       !Number.isSafeInteger(row.attempts)||row.attempts<1)
      throw Error('invalid_day_state');
    isoDay(row.metric_date);
    const checked=Date.parse(row.checked_at);
    if(!Number.isFinite(checked)||checked>input.now.getTime()+5*60_000)
      throw Error('invalid_checked_at');
    if(row.status==='success_with_data'&&row.rows_fetched===0||
       row.status==='success_no_data'&&row.rows_fetched!==0)
      throw Error('inconsistent_day_state');
    const previous=history.get(row.metric_date);
    if(!previous||Date.parse(previous.checked_at)<checked)history.set(row.metric_date,row);
  }
  const possible:GscCatchupTarget[]=[];
  let examined=0;
  for(let stamp=latest;stamp>=earliest;stamp-=DAY){
    const date=dayString(stamp);
    examined++;
    const row=history.get(date);
    if(!row){
      possible.push({date,reason:'missing',prior_attempts:0});
      continue;
    }
    if(row.status==='success_with_data')continue;
    const ageDays=(input.now.getTime()-Date.parse(row.checked_at))/DAY;
    if(row.status==='failed'&&ageDays>=1)
      possible.push({date,reason:'retry_failed',prior_attempts:row.attempts});
    // An empty successful response is NOT a failure. Recheck after 3 days,
    // then no more often than every 7 days to respect zero-cost quotas.
    if(row.status==='success_no_data'&&ageDays>=(row.attempts===1?3:7))
      possible.push({date,reason:'recheck_no_data',prior_attempts:row.attempts});
  }
  const order:Record<GscCatchupReason,number>={missing:0,retry_failed:1,recheck_no_data:2};
  possible.sort((a,b)=>order[a.reason]-order[b.reason]||b.date.localeCompare(a.date));
  return {eligible_through:dayString(latest),targets:possible.slice(0,maxDays),
    pending:Math.max(0,possible.length-maxDays),examined};
}
