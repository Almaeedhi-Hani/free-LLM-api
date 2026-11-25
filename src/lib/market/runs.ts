import type { RunType, RunStatus, TriggeredBy, AnalysisRun } from './types';
import { readFile, writeFile, sbFetch, assertOk, sbJson, isSupabase, nowIso } from './storage';
import { randomUUID } from 'crypto';

export async function startRun(runType: RunType, triggeredBy: TriggeredBy = 'manual'): Promise<AnalysisRun> {
  if (isSupabase()) {
    const res = await sbFetch('analysis_runs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ run_type: runType, status: 'running', triggered_by: triggeredBy }),
    });
    const rows = await sbJson<AnalysisRun[]>(res, 'startRun');
    return rows[0];
  }
  const now = nowIso();
  const run: AnalysisRun = {
    id: randomUUID(),
    run_type: runType,
    started_at: now,
    finished_at: null,
    status: 'running',
    summary: null,
    error: null,
    triggered_by: triggeredBy,
    created_at: now,
    updated_at: now,
  };
  const rows = readFile<AnalysisRun>('analysis_runs.json');
  rows.push(run);
  writeFile('analysis_runs.json', rows);
  return run;
}

export async function finishRun(
  id: string,
  status: RunStatus,
  summary?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const now = nowIso();
  if (isSupabase()) {
    const res = await sbFetch(`analysis_runs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status, finished_at: now, summary: summary ?? null, error: error ?? null }),
    });
    await assertOk(res, 'finishRun');
    return;
  }
  const rows = readFile<AnalysisRun>('analysis_runs.json');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], status, finished_at: now, summary: summary ?? null, error: error ?? null, updated_at: now };
    writeFile('analysis_runs.json', rows);
  }
}

export async function listRuns(limit = 20): Promise<AnalysisRun[]> {
  if (isSupabase()) {
    const res = await sbFetch(`analysis_runs?select=*&order=started_at.desc&limit=${limit}`);
    return sbJson<AnalysisRun[]>(res, 'listRuns');
  }
  return readFile<AnalysisRun>('analysis_runs.json')
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, limit);
}

/** Read only radar runs so unrelated analysis jobs cannot crowd out search history. */
export async function listRadarRuns(limit = 100): Promise<AnalysisRun[]> {
  const bounded = Math.max(1, Math.min(200, Math.trunc(limit)));
  if (isSupabase()) {
    const res = await sbFetch(`analysis_runs?select=*&run_type=eq.radar&order=started_at.desc&limit=${bounded}`);
    return sbJson<AnalysisRun[]>(res, 'listRadarRuns');
  }
  return readFile<AnalysisRun>('analysis_runs.json')
    .filter(r => r.run_type === 'radar')
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, bounded);
}
