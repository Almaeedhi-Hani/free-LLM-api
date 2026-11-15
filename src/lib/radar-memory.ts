import { RADAR_QUERIES, RadarLanguage, RadarQuery } from './radar-query-plan';
export interface QueryMemoryObservation { language: string; query: string; competitor_id: string; observed_at: string; rank?: number | null }
export interface QueryMemoryEntry extends RadarQuery { last_seen_at: string | null; observation_count: number; competitor_count: number; best_rank: number | null; days_since_seen: number | null; score: number }
export interface CompetitorMatrixEntry { competitor_id: string; languages: string[]; angles: string[]; queries: number; observations: number; best_rank: number | null }
/** Historical observations are evidence, not proof of current rankings. */
export function buildQueryMemory(observations: readonly QueryMemoryObservation[], now: Date): QueryMemoryEntry[] {
  const today = now.getTime();
  return (Object.keys(RADAR_QUERIES) as RadarLanguage[]).flatMap(language =>
    RADAR_QUERIES[language].map(({angle,query}) => {
      const matching = observations.filter(o => o.language === language && o.query.trim().toLowerCase() === query.toLowerCase());
      const validDates = matching.map(o => Date.parse(o.observed_at)).filter(Number.isFinite);
      const latest = validDates.length ? Math.max(...validDates) : null;
      const days = latest === null ? null : Math.max(0, Math.floor((today-latest)/86400000));
      const ranks = matching.map(o => o.rank).filter((n): n is number => typeof n === 'number' && n > 0);
      const unique = new Set(matching.map(o => o.competitor_id));
      // Prioritize uncovered queries, then stale observations; slight reward for competitor diversity.
      const score = latest === null ? 1000 : Math.min(days ?? 0,365) * 2 + Math.max(0, 10-unique.size);
      return {language,angle,query,last_seen_at:latest===null?null:new Date(latest).toISOString(),observation_count:matching.length,competitor_count:unique.size,best_rank:ranks.length?Math.min(...ranks):null,days_since_seen:days,score};
    })
  );
}
export function chooseNextQueries(memory: readonly QueryMemoryEntry[], perLanguage = 1, now = new Date()): RadarQuery[] {
  const limit = Math.max(0, Math.min(8, Math.trunc(perLanguage)));
  const day = Math.floor(now.getTime()/86400000);
  const angles = RADAR_QUERIES.ar.map(x=>x.angle);
  const tieOrder = (angle: string) => (angles.indexOf(angle as typeof angles[number]) - day % angles.length + angles.length) % angles.length;
  return (['ar','en','zh'] as const).flatMap(language =>
    memory.filter(x=>x.language===language)
      .sort((a,b)=>b.score-a.score || tieOrder(a.angle)-tieOrder(b.angle))
      .slice(0,limit).map(({language,angle,query})=>({language,angle,query}))
  );
}
export function buildCompetitorMatrix(observations: readonly QueryMemoryObservation[]): CompetitorMatrixEntry[] {
  const queryAngle = new Map<string,string>();
  for(const lang of ['ar','en','zh'] as const)
    for(const entry of RADAR_QUERIES[lang]) queryAngle.set(lang+'|'+entry.query.toLowerCase(),entry.angle);
  const grouped = new Map<string,QueryMemoryObservation[]>();
  for(const o of observations) {
    if(!grouped.has(o.competitor_id))grouped.set(o.competitor_id,[]);
    grouped.get(o.competitor_id)!.push(o);
  }
  return Array.from(grouped,([competitor_id,items])=>{
    const ranks=items.map(o=>o.rank).filter((n):n is number=>typeof n==='number'&&n>0);
    return {competitor_id,languages:Array.from(new Set(items.map(o=>o.language))).sort(),angles:Array.from(new Set(items.map(o=>queryAngle.get(o.language+'|'+o.query.toLowerCase())).filter((x):x is string=>Boolean(x)))).sort(),queries:new Set(items.map(o=>o.language+'|'+o.query.toLowerCase())).size,observations:items.length,best_rank:ranks.length?Math.min(...ranks):null};
  }).sort((a,b)=>b.angles.length-a.angles.length||b.queries-a.queries||a.competitor_id.localeCompare(b.competitor_id));
}
