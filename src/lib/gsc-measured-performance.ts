/** Pure Google Search Console performance summary from explicitly supplied Search Analytics rows.
 * No API access, fabricated metrics, ranking claims, or persistence. */
export interface GscPerformanceRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr?: number;
  position: number;
}
export interface GscMeasuredSummary {
  source: 'google_search_console';
  sampled_rows: number;
  clicks: number;
  impressions: number;
  ctr: number | null;
  average_position: number | null;
  dimensions: readonly string[];
  measured: true;
}
export function summarizeGscPerformance(
  rows: readonly GscPerformanceRow[],
  dimensions: readonly string[] = [],
): GscMeasuredSummary {
  const allowed = new Set(['query','page','country','device','date','searchAppearance']);
  if (dimensions.some(x=>!allowed.has(x)) || new Set(dimensions).size !== dimensions.length)
    throw Error('Invalid GSC dimensions');
  let clicks=0, impressions=0, weightedPosition=0, sampled_rows=0;
  for(const row of rows) {
    if(!row || !Array.isArray(row.keys) || row.keys.length!==dimensions.length ||
       row.keys.some(x=>typeof x!=='string') ||
       !Number.isSafeInteger(row.clicks) || row.clicks<0 ||
       !Number.isSafeInteger(row.impressions) || row.impressions<0 ||
       row.clicks>row.impressions || !Number.isFinite(row.position) || row.position<0)
      throw Error('Invalid GSC Search Analytics row');
    clicks+=row.clicks; impressions+=row.impressions;
    weightedPosition+=row.position*row.impressions; sampled_rows++;
    if(!Number.isSafeInteger(clicks)||!Number.isSafeInteger(impressions) ||
       !Number.isFinite(weightedPosition)) throw Error('GSC totals exceed safe bounds');
  }
  return {
    source:'google_search_console',sampled_rows,clicks,impressions,
    ctr:impressions>0?clicks/impressions:null,
    average_position:impressions>0?weightedPosition/impressions:null,
    dimensions:[...dimensions],measured:true,
  };
}
