import type { Language, OpportunityType, Priority, Confidence } from './types';

export function scoreOpportunity(input: {
  evidenceCount: number;
  languages: Language[];
  confidence: Confidence;
  type: OpportunityType;
}): number {
  const base = Math.min(40, input.evidenceCount * 10);
  const langBonus = Math.min(20, input.languages.length * 7);
  const confBonus = input.confidence === 'high' ? 25 : input.confidence === 'medium' ? 15 : 5;
  const typeBonus: Record<OpportunityType, number> = {
    service_gap: 15,
    content_gap: 10,
    keyword_gap: 8,
    faq_gap: 7,
    authority_gap: 5,
  };
  const raw = base + langBonus + confBonus + typeBonus[input.type];
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function priorityFromScore(score: number): Priority {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function prioritizeGoals<T extends { priority: Priority; confidence: Confidence }>(goals: T[]): T[] {
  const rank: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const conf: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
  return [...goals].sort((a, b) => {
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    return conf[a.confidence] - conf[b.confidence];
  });
}
