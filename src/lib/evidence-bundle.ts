import { listCompetitors, listObservations, listKeywords } from './market-intelligence';
import { EvidenceItem } from './llm-analysis';

export interface EvidenceBundle {
  items: EvidenceItem[];
  summary: { competitors: number; observations: number; keywords: number };
  built_at: string;
}

export async function buildEvidenceBundle(): Promise<EvidenceBundle> {
  const items: EvidenceItem[] = [];
  const competitors = await listCompetitors();
  for (const c of competitors) {
    const obs = await listObservations(c.id);
    // competitor evidence item
    items.push({
      id: `comp:${c.id}`,
      type: 'competitor',
      source: c.source || 'unknown',
      domain: c.domain,
      language: (c.languages || []).join(','),
      observed_at: c.last_seen_at,
    });
    for (const o of obs) {
      items.push({
        id: `obs:${o.id}`,
        type: 'observation',
        source: 'competitor_observation',
        domain: c.domain,
        language: o.language,
        observed_at: o.observed_at,
      });
    }
  }
  const keywords = await listKeywords();
  for (const k of keywords) {
    items.push({
      id: `kw:${k.id}`,
      type: 'keyword',
      source: k.source,
      term: k.term,
      language: k.language,
      observed_at: k.last_seen_at,
    });
  }
  return {
    items,
    summary: {
      competitors: competitors.length,
      observations: items.filter((i) => i.type === 'observation').length,
      keywords: keywords.length,
    },
    built_at: new Date().toISOString(),
  };
}
