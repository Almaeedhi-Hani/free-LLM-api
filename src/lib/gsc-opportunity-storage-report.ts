import {analyzeGscOpportunities} from './gsc-opportunity-analysis';
import type {GscOpportunityInput} from './gsc-opportunity-analysis';

export type GscStoredMetric={
 metric_date:string;dimension:'page'|'query'|'page_query';dimension_value:string;
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
  if(!validDate(m.metric_date)||!['page','query','page_query'].includes(m.dimension)||
     typeof m.dimension_value!=='string'||!m.dimension_value.trim()||
     !Number.isSafeInteger(m.clicks)||m.clicks<0||
     !Number.isSafeInteger(m.impressions)||m.impressions<0||
     m.clicks>m.impressions||!Number.isFinite(m.position)||m.position<0||
     !Number.isFinite(m.ctr)||m.ctr<0||m.ctr>1)
   throw Error('gsc_report_invalid_observation');
  let keys=[m.dimension_value];
  if(m.dimension==='page_query'){
   try{const parsed=JSON.parse(m.dimension_value) as unknown;
    if(!Array.isArray(parsed)||parsed.length!==2||
      parsed.some(key=>typeof key!=='string'||!key.trim()))throw Error('bad');
    keys=parsed as string[];
   }catch{throw Error('gsc_report_invalid_page_query_pair')}
  }
  rows.push({property,date:m.metric_date,grain:m.dimension,
    keys,clicks:m.clicks,
    impressions:m.impressions,position:m.position,ctr:m.ctr});
  rowDays.add(m.metric_date+'|'+m.dimension);
 }
 const coverage:Array<GscOpportunityInput['coverage'][number]>=[];
 if(hasAtomicDayStore){
  for(const day of dayOutcomes){
   if(!validDate(day.metric_date)||!['success_with_data','success_no_data','failed'].includes(day.status)||
      !Number.isSafeInteger(day.rows_fetched)||day.rows_fetched<0)
    throw Error('gsc_report_invalid_day_outcome');
   for(const grain of ['page','query','page_query'] as const){
    const observed=rowDays.has(day.metric_date+'|'+grain);
    coverage.push({property,date:day.metric_date,grain,
      outcome:day.status==='failed'?'failed':
       day.status==='success_no_data'?(observed?'failed':'complete_no_data'):
       observed?'complete_with_data':'complete_no_data'});
   }
  }
 }
 // Paired page/query rows must contain a real JSON tuple returned by Google;
 // the separate page/query grains can never generate synthetic paired records.
 const result=analyzeGscOpportunities({property,endDate,rows,coverage});
 return {
  ...result,
  operational_status:hasAtomicDayStore?'day_outcomes_read':'atomic_day_storage_pending',
  paired_grain_status:hasAtomicDayStore?'measured_grain':'awaiting_atomic_collection',
  measurement_note:'Only stored Google Search Console measurements; page-query pairs are never inferred.',
 };
}
