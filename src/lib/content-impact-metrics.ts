import type {ImpactMeasurement,ImpactStats} from './content-impact';

export interface GscPageRecord {
 property:string;metric_date:string;dimension:string;dimension_value:string;
 clicks:number;impressions:number;position:number;captured_at:string;
}
function safePagePath(value:string,property:string):string|null {
 try {
  const url=new URL(value),site=new URL(property);
  if(url.protocol!=='https:'||url.origin!==site.origin||url.username||url.password||url.search||url.hash)return null;
  const path=url.pathname.replace(/\/$/,'')||'/';
  return path;
 }catch{return null}
}
/** Aggregates only real Search Console page-dimension rows, never whole-site totals.
 * No row for a page means UNKNOWN (not 0 clicks). */
export function summarizePageImpact(rows:readonly GscPageRecord[],days:7|28|90,property:string):ImpactMeasurement {
 const byPath=new Map<string,{clicks:number;impressions:number;weighted:number;dates:Set<string>;latest:string|null}>();
 for(const row of rows){
  if(row.property!==property||row.dimension!=='page')continue;
  const path=safePagePath(row.dimension_value,property);
  if(!path||!/^\d{4}-\d{2}-\d{2}$/.test(row.metric_date)||
     !Number.isSafeInteger(row.clicks)||!Number.isSafeInteger(row.impressions)||
     row.clicks<0||row.impressions<0||row.clicks>row.impressions||
     !Number.isFinite(row.position)||row.position<0||
     !Number.isFinite(Date.parse(row.captured_at)))continue;
  const value=byPath.get(path)||{clicks:0,impressions:0,weighted:0,dates:new Set<string>(),latest:null};
  value.clicks+=row.clicks;value.impressions+=row.impressions;value.weighted+=row.position*row.impressions;
  value.dates.add(row.metric_date);
  if(!value.latest||row.captured_at>value.latest)value.latest=row.captured_at;
  byPath.set(path,value);
 }
 const pages:Record<string,ImpactStats>={};
 for(const [path,v] of Array.from(byPath.entries()))pages[path]={
  clicks:v.clicks,impressions:v.impressions,
  ctr:v.impressions?v.clicks/v.impressions:null,
  position:v.impressions?v.weighted/v.impressions:null,
  observedDays:v.dates.size,capturedAt:v.latest
 };
 return {source:'gsc_daily_page',days,
  status:byPath.size?'available':'no_page_rows',pages,
  message:byPath.size?'قياسات محفوظة من صفحات Google Search Console؛ لا تمثل ترتيبًا مضمونًا أو تحويلات عملاء.':
    'لا توجد لقطات GSC محفوظة بأبعاد الصفحة لهذه الفترة. بيانات الظهور والنقرات غير متوفرة، وليست صفرًا.'};
}
