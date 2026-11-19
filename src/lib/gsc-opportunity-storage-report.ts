import {analyzeGscOpportunities} from './gsc-opportunity-analysis';
import type {GscOpportunityInput} from './gsc-opportunity-analysis';

export type GscStoredMetric={
 metric_date:string;dimension:'page'|'query';dimension_value:string;
 clicks:number;impressions:number;ctr:number;position:number;
};
export type GscStoredDay={
 metric_date:string;status:'success_with_data'|'success_no_data'|'failed';
 rows_fetched:number;checked_at:string;
};
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

/** Never infer completed page/query coverage from historical site total rows. */
export function buildGscStoredOpportunityReport(input:{
 property:string;endDate:string;metrics:readonly GscStoredMetric[];
 dayOutcomes:readonly GscStoredDay[];hasAtomicDayStore:boolean;
}){
 const {property,endDate,metrics,dayOutcomes,hasAtomicDayStore}=input;
 if(!property||!validDate(endDate))throw Error('gsc_report_invalid_config');
 const rows:Array<GscOpportunityInput['rows'][number]>=[];
 const rowDays=new Set<string>();
 for(const m of metrics){
  if(!validDate(m.metric_date)||!['page','query'].includes(m.dimension)||
     typeof m.dimension_value!=='string'||!m.dimension_value.trim()||
     !Number.isSafeInteger(m.clicks)||m.clicks<0||
     !Number.isSafeInteger(m.impressions)||m.impressions<0||
     m.clicks>m.impressions||!Number.isFinite(m.position)||m.position<0||
     !Number.isFinite(m.ctr)||m.ctr<0||m.ctr>1)
   throw Error('gsc_report_invalid_observation');
  rows.push({property,date:m.metric_date,grain:m.dimension,
    keys:[m.dimension_value],clicks:m.clicks,
    impressions:m.impressions,position:m.position,ctr:m.ctr});
  rowDays.add(m.metric_date+'|'+m.dimension);
 }
 const coverage:Array<GscOpportunityInput['coverage'][number]>=[];
 if(hasAtomicDayStore){
  for(const day of dayOutcomes){
   if(!validDate(day.metric_date)||!['success_with_data','success_no_data','failed'].includes(day.status)||
      !Number.isSafeInteger(day.rows_fetched)||day.rows_fetched<0)
    throw Error('gsc_report_invalid_day_outcome');
   for(const grain of ['page','query'] as const){
    const observed=rowDays.has(day.metric_date+'|'+grain);
    coverage.push({property,date:day.metric_date,grain,
      outcome:day.status==='failed'?'failed':
       day.status==='success_no_data'?(observed?'failed':'complete_no_data'):
       observed?'complete_with_data':'complete_no_data'});
   }
  }
 }
 // page_query is intentionally NOT inferred from independent single-grain data.
 // Paired GSC data needs a separately approved two-dimension collection/schema.
 const result=analyzeGscOpportunities({property,endDate,rows,coverage});
 return {
  ...result,
  operational_status:hasAtomicDayStore?'day_outcomes_read':'atomic_day_storage_pending',
  paired_grain_status:'not_collected',
  measurement_note:'Only stored Google Search Console measurements; no synthetic page-query pairs.',
 };
}
