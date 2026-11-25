import type { Language, CompetitorStatus, Competitor, CompetitorObservation, UpsertCompetitorInput, RecordObservationInput } from './types';
import { normalizeDomain } from './classification';
import { withFileLock, readFile, writeFile, sbFetch, sbJson, isSupabase, nowIso } from './storage';
import { randomUUID } from 'crypto';

export async function listCompetitors(filters?: {
  status?: CompetitorStatus;
  market?: string;
}): Promise<Competitor[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=last_seen_at.desc'];
    if (filters?.status) params.push(`status=eq.${encodeURIComponent(filters.status)}`);
    if (filters?.market) params.push(`market=eq.${encodeURIComponent(filters.market)}`);
    const res = await sbFetch(`competitors?${params.join('&')}`);
    return sbJson<Competitor[]>(res, 'listCompetitors');
  }
  let rows = readFile<Competitor>('competitors.json');
  if (filters?.status) rows = rows.filter((c) => c.status === filters.status);
  if (filters?.market) rows = rows.filter((c) => c.market === filters.market);
  return rows.sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
}

export async function getCompetitor(idOrDomain: string): Promise<Competitor | null> {
  const key = idOrDomain.trim();
  if (!key) return null;
  if (isSupabase()) {
    // UUID columns must never receive a hostname: Postgres rejects that with 22P02.
    // Domain and ID lookups are independent and must use their correct column types.
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(key)) {
      const byId = await sbFetch(`competitors?id=eq.${encodeURIComponent(key)}&select=*&limit=1`);
      const rows = await sbJson<Competitor[]>(byId, 'getCompetitor');
      if (rows.length) return rows[0];
    }
    const normalized = normalizeDomain(key);
    if (!normalized) return null;
    const byDomain = await sbFetch(`competitors?domain=eq.${encodeURIComponent(normalized)}&select=*&limit=1`);
    const rows = await sbJson<Competitor[]>(byDomain, 'getCompetitor');
    return rows[0] || null;
  }
  const rows = readFile<Competitor>('competitors.json');
  return (
    rows.find((c) => c.id === key || c.domain === normalizeDomain(key)) || null
  );
}

export async function upsertCompetitor(input: UpsertCompetitorInput): Promise<Competitor> {
  const domain = normalizeDomain(input.domain);
  if (!domain) throw new Error('Competitor domain is required');
  const name = input.name.trim();
  if (!name) throw new Error('Competitor name is required');

  if (isSupabase()) {
    const existing = await getCompetitor(domain);
    const now = nowIso();
    if (existing) {
      const res = await sbFetch(`competitors?id=eq.${existing.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          name,
          languages: Array.from(new Set([...(existing.languages || []), ...(input.languages || [])])),
          market: input.market ?? existing.market,
          source: input.source ?? existing.source,
          notes: input.notes ?? existing.notes,
          last_seen_at: now,
        }),
      });
      const rows = await sbJson<Competitor[]>(res, 'upsertCompetitor');
      return rows[0];
    }
    const res = await sbFetch('competitors', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        name,
        domain,
        languages: input.languages ?? [],
        market: input.market ?? 'saudi-company-formation',
        source: input.source ?? 'manual',
        notes: input.notes ?? null,
        first_seen_at: now,
        last_seen_at: now,
      }),
    });
    const rows = await sbJson<Competitor[]>(res, 'upsertCompetitor');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<Competitor>('competitors.json');
    const idx = rows.findIndex((c) => c.domain === domain);
    const now = nowIso();
    if (idx >= 0) {
      rows[idx] = {
        ...rows[idx],
        name,
        languages: Array.from(new Set([...(rows[idx].languages || []), ...(input.languages || [])])),
        market: input.market ?? rows[idx].market,
        source: input.source ?? rows[idx].source,
        notes: input.notes ?? rows[idx].notes,
        last_seen_at: now,
        updated_at: now,
      };
      writeFile('competitors.json', rows);
      return rows[idx];
    }
    const created: Competitor = {
      id: randomUUID(),
      name,
      domain,
      languages: input.languages ?? [],
      market: input.market ?? 'saudi-company-formation',
      status: 'active',
      source: input.source ?? 'manual',
      notes: input.notes,
      first_seen_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    };
    rows.push(created);
    writeFile('competitors.json', rows);
    return created;
  });
}

export async function updateCompetitor(id: string, patch: Partial<Competitor>): Promise<Competitor | null> {
  if (isSupabase()) {
    const res = await sbFetch(`competitors?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    const rows = await sbJson<Competitor[]>(res, 'updateCompetitor');
    return rows.length ? rows[0] : null;
  }
  return withFileLock(() => {
    const rows = readFile<Competitor>('competitors.json');
    const idx = rows.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() };
    writeFile('competitors.json', rows);
    return rows[idx];
  });
}

export async function disqualifyCompetitor(id: string, reason: string): Promise<Competitor | null> {
  return updateCompetitor(id, { status: 'disqualified', notes: reason });
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

export async function recordObservation(input: RecordObservationInput): Promise<CompetitorObservation> {
  const observed_at = input.observed_at || nowIso();
  const payload: CompetitorObservation = {
    id: randomUUID(),
    competitor_id: input.competitor_id,
    observed_at,
    language: input.language,
    query: input.query.trim(),
    rank: input.rank ?? null,
    title: input.title,
    snippet: input.snippet,
    url: input.url,
    page_type: input.page_type ?? null,
    strengths: input.strengths ?? [],
    weaknesses: input.weaknesses ?? [],
    raw: input.raw ?? null,
  };

  if (isSupabase()) {
    const res = await sbFetch('competitor_observations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      // Duplicate observation; return the existing one.
      const existing = await sbFetch(
        `competitor_observations?competitor_id=eq.${encodeURIComponent(input.competitor_id)}` +
          `&language=eq.${encodeURIComponent(input.language)}` +
          `&query=eq.${encodeURIComponent(input.query.trim())}` +
          '&select=*&order=observed_at.desc&limit=1'
      );
      const rows = await sbJson<CompetitorObservation[]>(existing, 'recordObservation');
      if (rows.length) return rows[0];
    }
    const rows = await sbJson<CompetitorObservation[]>(res, 'recordObservation');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<CompetitorObservation>('competitor_observations.json');
    const dup = rows.find(
      (o) =>
        o.competitor_id === input.competitor_id &&
        o.language === input.language &&
        o.query === input.query.trim() &&
        o.observed_at === observed_at
    );
    if (dup) return dup;
    rows.push(payload);
    writeFile('competitor_observations.json', rows);
    return payload;
  });
}

/** Exact historical lookup: no arbitrary recent-observation window. */
export async function findVerifiedSerpObservation(input: {
  competitor_id: string; language: Language; query: string; observed_at: string;
  rank: number; url: string; source: string;
}): Promise<CompetitorObservation | null> {
  const matches = (o: CompetitorObservation) =>
    o.competitor_id === input.competitor_id &&
    o.language === input.language &&
    o.query.trim().toLowerCase() === input.query.trim().toLowerCase() &&
    o.observed_at === input.observed_at && o.rank === input.rank &&
    o.url === input.url && o.raw?.rank_status === 'verified_serp' &&
    o.raw?.source_id === input.source;
  if (isSupabase()) {
    // Narrow on indexed-compatible scalar columns; filter provenance locally.
    const base = 'competitor_observations?competitor_id=eq.' + encodeURIComponent(input.competitor_id) +
      '&language=eq.' + encodeURIComponent(input.language) +
      '&observed_at=eq.' + encodeURIComponent(input.observed_at) +
      '&rank=eq.' + input.rank +
      '&url=eq.' + encodeURIComponent(input.url) +
      '&select=*&limit=1000';
    const rows = await sbJson<CompetitorObservation[]>(await sbFetch(base), 'findVerifiedSerpObservation');
    // Fail closed if the bounded response might hide a match.
    if (rows.length >= 1000) throw new Error('SERP duplicate lookup exceeded safe limit');
    return rows.find(matches) ?? null;
  }
  return readFile<CompetitorObservation>('competitor_observations.json').find(matches) ?? null;
}

export async function listObservations(competitorId: string, limit = 50): Promise<CompetitorObservation[]> {
  if (isSupabase()) {
    const res = await sbFetch(
      `competitor_observations?competitor_id=eq.${encodeURIComponent(competitorId)}` +
        `&select=*&order=observed_at.desc&limit=${limit}`
    );
    return sbJson<CompetitorObservation[]>(res, 'listObservations');
  }
  return readFile<CompetitorObservation>('competitor_observations.json')
    .filter((o) => o.competitor_id === competitorId)
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at))
    .slice(0, limit);
}
