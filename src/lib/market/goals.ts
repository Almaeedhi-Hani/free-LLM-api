import type { Priority, GoalStatus, AgentGoal, CreateGoalInput } from './types';
import { withFileLock, readFile, writeFile, sbFetch, sbJson, isSupabase, nowIso } from './storage';
import { randomUUID } from 'crypto';

export async function createGoal(input: CreateGoalInput): Promise<AgentGoal> {
  const title = input.title.trim();
  if (!title) throw new Error('Goal title is required');

  if (isSupabase()) {
    const existingRes = await sbFetch(
      `agent_goals?title=eq.${encodeURIComponent(title)}` +
        `&related_opportunity_id=${input.related_opportunity_id ? `eq.${encodeURIComponent(input.related_opportunity_id)}` : 'is.null'}` +
        '&select=*&limit=1'
    );
    const existingRows = await sbJson<AgentGoal[]>(existingRes, 'createGoal');
    if (existingRows.length) return existingRows[0];

    const res = await sbFetch('agent_goals', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        title,
        description: input.description ?? null,
        priority: input.priority ?? 'medium',
        evidence: input.evidence,
        success_metrics: input.success_metrics,
        confidence: input.confidence ?? 'low',
        related_opportunity_id: input.related_opportunity_id ?? null,
      }),
    });
    const rows = await sbJson<AgentGoal[]>(res, 'createGoal');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<AgentGoal>('agent_goals.json');
    const dup = rows.find(
      (g) =>
        g.title === title &&
        (g.related_opportunity_id ?? null) === (input.related_opportunity_id ?? null)
    );
    if (dup) return dup;
    const now = nowIso();
    const created: AgentGoal = {
      id: randomUUID(),
      title,
      description: input.description,
      priority: input.priority ?? 'medium',
      status: 'open',
      evidence: input.evidence,
      success_metrics: input.success_metrics,
      confidence: input.confidence ?? 'low',
      related_opportunity_id: input.related_opportunity_id ?? null,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };
    rows.push(created);
    writeFile('agent_goals.json', rows);
    return created;
  });
}

export async function updateGoal(id: string, patch: Partial<AgentGoal>): Promise<AgentGoal | null> {
  if (isSupabase()) {
    const res = await sbFetch(`agent_goals?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const rows = await sbJson<AgentGoal[]>(res, 'updateGoal');
    return rows.length ? rows[0] : null;
  }
  return withFileLock(() => {
    const rows = readFile<AgentGoal>('agent_goals.json');
    const idx = rows.findIndex((g) => g.id === id);
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() };
    writeFile('agent_goals.json', rows);
    return rows[idx];
  });
}

export async function listGoals(filters?: {
  status?: GoalStatus;
  priority?: Priority;
}): Promise<AgentGoal[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=created_at.desc'];
    if (filters?.status) params.push(`status=eq.${encodeURIComponent(filters.status)}`);
    if (filters?.priority) params.push(`priority=eq.${encodeURIComponent(filters.priority)}`);
    const res = await sbFetch(`agent_goals?${params.join('&')}`);
    return sbJson<AgentGoal[]>(res, 'listGoals');
  }
  let rows = readFile<AgentGoal>('agent_goals.json');
  if (filters?.status) rows = rows.filter((g) => g.status === filters.status);
  if (filters?.priority) rows = rows.filter((g) => g.priority === filters.priority);
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
