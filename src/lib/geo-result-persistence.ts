// GEO Result Persistence — Transform LLM output to DB schema and save.
// Local: file-based. Production: Supabase (via market-intelligence CRUD).
// No production writes without approval.

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { EvidenceItem } from './llm-analysis';

export interface PersistedOpportunity {
  id: string;
  title: string;
  type: string;
  priority: string;
  score: number;
  score_breakdown: Record<string, number>;
  evidence: Array<{ source: string; url?: string; quote?: string; observed_at?: string }>;
  evidence_ids: string[];
  languages: string[];
  related_keywords: string[];
  related_competitors: string[];
  status: string;
  confidence: string;
  estimated_impact: string | null;
  source_run_id: string | null;
  data_gaps: string[];
  created_at: string;
  updated_at: string;
}

export interface PersistedGoal {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  evidence: Array<{ source: string; url?: string; quote?: string; observed_at?: string }>;
  success_metrics: Array<{ metric: string; target: string; measurement: string }>;
  confidence: string;
  related_opportunity_id: string | null;
  source_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedDraft {
  id: string;
  q: string;
  a: string;
  risk_level: string;
  evidence_ids: string[];
  evidence: Array<{ source: string; url?: string; quote?: string; observed_at?: string }>;
  status: string; // pending_review | approved | rejected | published
  source_run_id: string | null;
  created_at: string;
  updated_at: string;
}

const RESULTS_FILE = path.join(process.cwd(), 'market-intel', 'geo-persisted-results.json');

function ensureDir() {
  const dir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readResults(): { opportunities: PersistedOpportunity[]; goals: PersistedGoal[]; drafts: PersistedDraft[] } {
  ensureDir();
  if (!fs.existsSync(RESULTS_FILE)) return { opportunities: [], goals: [], drafts: [] };
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  } catch {
    return { opportunities: [], goals: [], drafts: [] };
  }
}

function writeResults(data: { opportunities: PersistedOpportunity[]; goals: PersistedGoal[]; drafts: PersistedDraft[] }) {
  ensureDir();
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

// Transform LLM evidence_ids to Evidence references
export function transformEvidenceIds(
  evidenceIds: string[],
  evidenceMap: Map<string, EvidenceItem>
): Array<{ source: string; url?: string; quote?: string; observed_at?: string }> {
  return evidenceIds.map((id) => {
    const item = evidenceMap.get(id);
    return {
      source: item?.source || 'unknown',
      url: undefined, // URL not in EvidenceItem — would need enrichment
      observed_at: item?.observed_at,
    };
  });
}

// Extract related keywords/competitors from evidence_ids
export function extractRelatedFromEvidence(
  evidenceIds: string[],
  evidenceMap: Map<string, EvidenceItem>
): { keywords: string[]; competitors: string[] } {
  const keywords = new Set<string>();
  const competitors = new Set<string>();
  for (const id of evidenceIds) {
    const item = evidenceMap.get(id);
    if (!item) continue;
    if (item.type === 'keyword' && item.term) keywords.add(item.term);
    if (item.type === 'competitor' && item.domain) competitors.add(item.domain);
    if (item.type === 'observation' && item.domain) competitors.add(item.domain);
  }
  return { keywords: Array.from(keywords), competitors: Array.from(competitors) };
}

// Save opportunities (dedup by title+type)
export function saveOpportunities(
  opportunities: Array<{
    title: string;
    type: string;
    evidence_ids: string[];
    score: number;
    rationale: string;
  }>,
  evidenceMap: Map<string, EvidenceItem>,
  sourceRunId: string | null,
  scoringBreakdowns: Map<string, Record<string, number>>,
  dataGapsMap: Map<string, string[]>
): PersistedOpportunity[] {
  const data = readResults();
  const now = nowIso();
  const saved: PersistedOpportunity[] = [];

  for (const opp of opportunities) {
    // Dedup check
    const existing = data.opportunities.find((o) => o.title === opp.title && o.type === opp.type);
    if (existing) {
      // Update existing
      existing.score = opp.score;
      existing.evidence = transformEvidenceIds(opp.evidence_ids, evidenceMap);
      existing.evidence_ids = opp.evidence_ids;
      existing.updated_at = now;
      existing.source_run_id = sourceRunId;
      saved.push(existing);
      continue;
    }

    const { keywords, competitors } = extractRelatedFromEvidence(opp.evidence_ids, evidenceMap);
    const languages = Array.from(new Set(opp.evidence_ids.map((id) => String(evidenceMap.get(id)?.language || '')).filter(Boolean))) as string[];

    const persisted: PersistedOpportunity = {
      id: randomUUID(),
      title: opp.title,
      type: opp.type,
      priority: opp.score >= 80 ? 'critical' : opp.score >= 60 ? 'high' : opp.score >= 40 ? 'medium' : 'low',
      score: opp.score,
      score_breakdown: scoringBreakdowns.get(opp.title) || {},
      evidence: transformEvidenceIds(opp.evidence_ids, evidenceMap),
      evidence_ids: opp.evidence_ids,
      languages,
      related_keywords: keywords,
      related_competitors: competitors,
      status: 'new',
      confidence: opp.score >= 70 ? 'high' : opp.score >= 50 ? 'medium' : 'low',
      estimated_impact: opp.rationale.substring(0, 200),
      source_run_id: sourceRunId,
      data_gaps: dataGapsMap.get(opp.title) || [],
      created_at: now,
      updated_at: now,
    };

    data.opportunities.push(persisted);
    saved.push(persisted);
  }

  writeResults(data);
  return saved;
}

// Save goals (dedup by title, link to opportunity_id)
export function saveGoals(
  goals: Array<{
    title: string;
    opportunity_index: number;
    success_metrics: Array<{ metric: string; target: string; measurement: string }>;
    confidence: string;
  }>,
  opportunities: PersistedOpportunity[],
  evidenceMap: Map<string, EvidenceItem>,
  sourceRunId: string | null
): PersistedGoal[] {
  const data = readResults();
  const now = nowIso();
  const saved: PersistedGoal[] = [];

  for (const goal of goals) {
    const existing = data.goals.find((g) => g.title === goal.title);
    if (existing) {
      existing.success_metrics = goal.success_metrics;
      existing.confidence = goal.confidence as any;
      existing.updated_at = now;
      existing.source_run_id = sourceRunId;
      saved.push(existing);
      continue;
    }

    const relatedOpp = opportunities[goal.opportunity_index];
    const persisted: PersistedGoal = {
      id: randomUUID(),
      title: goal.title,
      description: null,
      priority: goal.confidence === 'high' ? 'high' : 'medium',
      status: 'open',
      evidence: relatedOpp ? relatedOpp.evidence : [],
      success_metrics: goal.success_metrics,
      confidence: goal.confidence as any,
      related_opportunity_id: relatedOpp?.id || null,
      source_run_id: sourceRunId,
      created_at: now,
      updated_at: now,
    };

    data.goals.push(persisted);
    saved.push(persisted);
  }

  writeResults(data);
  return saved;
}

// Save drafts (dedup by q, status=pending_review)
export function saveDrafts(
  drafts: Array<{
    q: string;
    a: string;
    risk_level: string;
    evidence_ids: string[];
  }>,
  evidenceMap: Map<string, EvidenceItem>,
  sourceRunId: string | null
): PersistedDraft[] {
  const data = readResults();
  const now = nowIso();
  const saved: PersistedDraft[] = [];

  for (const draft of drafts) {
    const existing = data.drafts.find((d) => d.q === draft.q);
    if (existing) {
      existing.a = draft.a;
      existing.risk_level = draft.risk_level;
      existing.evidence_ids = draft.evidence_ids;
      existing.evidence = transformEvidenceIds(draft.evidence_ids, evidenceMap);
      existing.updated_at = now;
      existing.source_run_id = sourceRunId;
      saved.push(existing);
      continue;
    }

    const persisted: PersistedDraft = {
      id: randomUUID(),
      q: draft.q,
      a: draft.a,
      risk_level: draft.risk_level,
      evidence_ids: draft.evidence_ids,
      evidence: transformEvidenceIds(draft.evidence_ids, evidenceMap),
      status: 'pending_review',
      source_run_id: sourceRunId,
      created_at: now,
      updated_at: now,
    };

    data.drafts.push(persisted);
    saved.push(persisted);
  }

  writeResults(data);
  return saved;
}

export function getResults() {
  return readResults();
}

export function clearResults() {
  writeResults({ opportunities: [], goals: [], drafts: [] });
}
