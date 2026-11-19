/**
 * Data-driven GSC catch-up planning, with injected UTC clock and no network/DB writes.
 * Historical zero-row responses must be persisted as success_no_data by a separate
 * approved storage integration; a missing DB row alone cannot establish failure.
 */
import { collectGscDimensionRows } from './gsc-sync-collector';
import type { GscDimension, GscRow } from './gsc-sync-collector';

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
type GscPlanInput={
  now:Date;earliestDate:string;history:GscSyncDayRecord[];maxDays?:number;lookbackDays?:number;
};
export function planGscCatchup(input:GscPlanInput):GscBackfillPlan{
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

type GscMeasurement = {
  dimension: Exclude<GscDimension, null> | 'total';
  dimension_value: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscDayWrite = {
  property: string;
  outcome: GscSyncDayRecord;
  measurements: GscMeasurement[];
};

type GscDayResult = {
  outcome: GscSyncDayRecord;
  rows_by_dimension: Record<GscMeasurement['dimension'], number>;
  failure?: 'collection_failed' | 'quota_reached';
};

const SYNC_DIMENSIONS = [null, 'query', 'page', 'country', 'device'] as const;

export class GscQuotaReached extends Error {}

/** Execute only against a verified adapter. The live endpoint is not wired to this contract. */
export async function executeGscCatchup(input: GscPlanInput & {
  property: string;
  queryRows: (date: string, dimension: GscDimension, startRow: number, rowLimit: number) => Promise<GscRow[]>;
  // Serialize updates for a property/date, check the previous attempt count and
  // commit measurements and outcome together. Preserve measurements on failure.
  commitDay: (write: GscDayWrite) => Promise<void>;
  // Independently read the stored outcome and count expected measurements whose
  // property, day, dimension, key and values match. Earlier rows may still exist.
  readDay: (expectedWrite: GscDayWrite) => Promise<{
    outcome: GscSyncDayRecord | null;
    matchingMeasurements: number;
  }>;
}): Promise<{ plan: GscBackfillPlan; results: GscDayResult[]; unattempted: number }> {
  if (!input.property.trim()) throw Error('missing_gsc_property');
  const plan = planGscCatchup(input);
  const results: GscDayResult[] = [];

  for (const target of plan.targets) {
    let measurements: GscMeasurement[] = [];
    let failure: GscDayResult['failure'];
    try {
      for (const dimension of SYNC_DIMENSIONS) {
        const rows = await collectGscDimensionRows(
          (grain, start, limit) => input.queryRows(target.date, grain, start, limit),
          dimension,
        );
        const grainKeys = new Set<string>();
        for (const row of rows) {
          const value = row.keys?.[0] ?? '';
          if (grainKeys.has(value)) throw Error('duplicate_gsc_dimension_key');
          grainKeys.add(value);
          measurements.push({
            dimension: dimension ?? 'total',
            dimension_value: value,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          });
        }
      }
    } catch (error) {
      measurements = [];
      failure = error instanceof GscQuotaReached ? 'quota_reached' : 'collection_failed';
    }

    const outcome: GscSyncDayRecord = {
      metric_date: target.date,
      status: failure ? 'failed' : measurements.length ? 'success_with_data' : 'success_no_data',
      checked_at: input.now.toISOString(),
      rows_fetched: measurements.length,
      attempts: target.prior_attempts + 1,
    };
    const write = { property: input.property, outcome, measurements };
    await input.commitDay(write);
    const { outcome: observed, matchingMeasurements } = await input.readDay(write);
    if (!observed || observed.metric_date !== target.date || observed.status !== outcome.status ||
        Date.parse(observed.checked_at) !== input.now.getTime() || observed.rows_fetched !== outcome.rows_fetched ||
        observed.attempts !== outcome.attempts || matchingMeasurements !== measurements.length) {
      throw Error('gsc_day_readback_mismatch');
    }
    const rowsByDimension = { total: 0, query: 0, page: 0, country: 0, device: 0 };
    for (const measurement of measurements) rowsByDimension[measurement.dimension]++;
    const result = { outcome, rows_by_dimension: rowsByDimension };
    results.push(failure ? { ...result, failure } : result);
    if (failure === 'quota_reached') break;
  }

  return { plan, results, unattempted: plan.targets.length - results.length };
}
