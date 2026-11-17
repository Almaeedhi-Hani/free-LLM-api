/** Daily GSC history is evidence, not a continuous time series by assumption. */
export type DailyGscMetric = {
  metric_date:string; clicks:number; impressions:number;
  position:number|null;
};
export function compareConsecutiveGscDays(rows:readonly DailyGscMetric[]) {
  const [latest,previous]=rows;
  if(!latest||!previous)return {change:null,alerts:[],comparison:'insufficient_data' as const};
  const day=/^\d{4}-\d{2}-\d{2}$/;
  const validDate=(value:string)=>{
    if(!day.test(value))return null;
    const time=Date.parse(value+'T00:00:00.000Z');
    return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time:null;
  };
  const current=validDate(latest.metric_date),prior=validDate(previous.metric_date);
  if(current===null||prior===null||current-prior!==86400000)
    return {change:null,alerts:[],comparison:'nonconsecutive_dates' as const};
  if(![latest.clicks,latest.impressions,previous.clicks,previous.impressions].every(n=>Number.isSafeInteger(n)&&n>=0))
    return {change:null,alerts:[],comparison:'invalid_metrics' as const};
  if(latest.clicks>latest.impressions||previous.clicks>previous.impressions)
    return {change:null,alerts:[],comparison:'invalid_metrics' as const};
  const position=latest.position!==null&&previous.position!==null&&
    Number.isFinite(latest.position)&&Number.isFinite(previous.position)&&
    latest.position>=0&&previous.position>=0
      ?latest.position-previous.position:null;
  const change={clicks:latest.clicks-previous.clicks,
    impressions:latest.impressions-previous.impressions,position};
  const alerts=previous.impressions>=10&&change.impressions<=-Math.ceil(previous.impressions*0.3)
    ?[{type:'impressions_drop',message:'انخفاض الظهور اليومي بنسبة 30% أو أكثر مقارنة باليوم السابق'}]:[];
  return {change,alerts,comparison:'consecutive_days' as const};
}
