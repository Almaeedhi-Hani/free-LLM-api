import type { OpportunityType, Priority, OpportunityStatus, Opportunity, CreateOpportunityInput } from './types';
import { scoreOpportunity, priorityFromScore } from './scoring';
import { withFileLock, readFile, writeFile, sbFetch, sbJson, isSupabase, nowIso } from './storage';
import { randomUUID } from 'crypto';

export async function createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
  const title = input.title.trim();
  if (!title) throw new Error('Opportunity title is required');

  if (isSupabase()) {
    const existingRes = await sbFetch(
      `opportunities?title=eq.${encodeURIComponent(title)}&type=eq.${encodeURIComponent(input.type)}&select=*&limit=1`
    );
    const existingRows = await sbJson<Opportunity[]>(existingRes, 'createOpportunity');
    if (existingRows.length) return existingRows[0];

    const score = input.score ?? scoreOpportunity({
      evidenceCount: input.evidence.length,
      languages: input.languages ?? [],
      confidence: input.confidence ?? 'low',
      type: input.type,
    });
    const res = await sbFetch('opportunities', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        title,
        type: input.type,
        priority: input.priority ?? priorityFromScore(score),
        score,
        evidence: input.evidence,
        languages: input.languages ?? [],
        related_keywords: input.related_keywords ?? [],
        related_competitors: input.related_competitors ?? [],
        confidence: input.confidence ?? 'low',
        estimated_impact: input.estimated_impact ?? null,
      }),
    });
    const rows = await sbJson<Opportunity[]>(res, 'createOpportunity');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<Opportunity>('opportunities.json');
    const dup = rows.find((o) => o.title === title && o.type === input.type);
    if (dup) return dup;
    const now = nowIso();
    const score = input.score ?? scoreOpportunity({
      evidenceCount: input.evidence.length,
      languages: input.languages ?? [],
      confidence: input.confidence ?? 'low',
      type: input.type,
    });
    const created: Opportunity = {
      id: randomUUID(),
      title,
      type: input.type,
      priority: input.priority ?? priorityFromScore(score),
      score,
      evidence: input.evidence,
      languages: input.languages ?? [],
      related_keywords: input.related_keywords ?? [],
      related_competitors: input.related_competitors ?? [],
      status: 'new',
      confidence: input.confidence ?? 'low',
      estimated_impact: input.estimated_impact,
      created_at: now,
      updated_at: now,
    };
    rows.push(created);
    writeFile('opportunities.json', rows);
    return created;
  });
}

export async function updateOpportunity(id: string, patch: Partial<Opportunity>): Promise<Opportunity | null> {
  if (isSupabase()) {
    const res = await sbFetch(`opportunities?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const rows = await sbJson<Opportunity[]>(res, 'updateOpportunity');
    return rows.length ? rows[0] : null;
  }
  return withFileLock(() => {
    const rows = readFile<Opportunity>('opportunities.json');
    const idx = rows.findIndex((o) => o.id === id);
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() };
    writeFile('opportunities.json', rows);
    return rows[idx];
  });
}

export async function listOpportunities(filters?: {
  status?: OpportunityStatus;
  priority?: Priority;
  type?: OpportunityType;
}): Promise<Opportunity[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=score.desc'];
    if (filters?.status) params.push(`status=eq.${encodeURIComponent(filters.status)}`);
    if (filters?.priority) params.push(`priority=eq.${encodeURIComponent(filters.priority)}`);
    if (filters?.type) params.push(`type=eq.${encodeURIComponent(filters.type)}`);
    const res = await sbFetch(`opportunities?${params.join('&')}`);
    return sbJson<Opportunity[]>(res, 'listOpportunities');
  }
  let rows = readFile<Opportunity>('opportunities.json');
  if (filters?.status) rows = rows.filter((o) => o.status === filters.status);
  if (filters?.priority) rows = rows.filter((o) => o.priority === filters.priority);
  if (filters?.type) rows = rows.filter((o) => o.type === filters.type);
  return rows.sort((a, b) => b.score - a.score);
}
