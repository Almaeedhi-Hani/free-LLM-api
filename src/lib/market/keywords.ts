import type { Language, Intent, Keyword, UpsertKeywordInput } from './types';
import { classifyIntent } from './classification';
import { withFileLock, readFile, writeFile, sbFetch, sbJson, isSupabase, nowIso } from './storage';
import { randomUUID } from 'crypto';

export async function upsertKeyword(input: UpsertKeywordInput): Promise<Keyword> {
  const term = input.term.trim();
  if (!term) throw new Error('Keyword term is required');

  if (isSupabase()) {
    const existingRes = await sbFetch(
      `keywords?term=eq.${encodeURIComponent(term)}&language=eq.${encodeURIComponent(input.language)}&select=*&limit=1`
    );
    const existingRows = await sbJson<Keyword[]>(existingRes, 'upsertKeyword');
    const now = nowIso();
    if (existingRows.length) {
      const existing = existingRows[0];
      const res = await sbFetch(`keywords?id=eq.${existing.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          intent: input.intent ?? existing.intent,
          cluster: input.cluster ?? existing.cluster,
          source: input.source || existing.source,
          search_volume:
            input.search_volume !== undefined ? input.search_volume : existing.search_volume,
          volume_source:
            input.volume_source !== undefined ? input.volume_source : existing.volume_source,
          volume_confidence: input.volume_confidence ?? existing.volume_confidence,
          last_seen_at: now,
        }),
      });
      const rows = await sbJson<Keyword[]>(res, 'upsertKeyword');
      return rows[0];
    }
    const res = await sbFetch('keywords', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        term,
        language: input.language,
        intent: input.intent ?? classifyIntent(term),
        cluster: input.cluster ?? null,
        source: input.source,
        search_volume: input.search_volume ?? null,
        volume_source: input.volume_source ?? null,
        volume_confidence: input.volume_confidence ?? 'unknown',
        first_seen_at: now,
        last_seen_at: now,
      }),
    });
    const rows = await sbJson<Keyword[]>(res, 'upsertKeyword');
    return rows[0];
  }

  return withFileLock(() => {
    const rows = readFile<Keyword>('keywords.json');
    const idx = rows.findIndex((k) => k.term === term && k.language === input.language);
    const now = nowIso();
    if (idx >= 0) {
      rows[idx] = {
        ...rows[idx],
        intent: input.intent ?? rows[idx].intent,
        cluster: input.cluster ?? rows[idx].cluster,
        source: input.source || rows[idx].source,
        search_volume:
          input.search_volume !== undefined ? input.search_volume : rows[idx].search_volume,
        volume_source:
          input.volume_source !== undefined ? input.volume_source : rows[idx].volume_source,
        volume_confidence: input.volume_confidence ?? rows[idx].volume_confidence,
        last_seen_at: now,
        updated_at: now,
      };
      writeFile('keywords.json', rows);
      return rows[idx];
    }
    const created: Keyword = {
      id: randomUUID(),
      term,
      language: input.language,
      intent: input.intent ?? classifyIntent(term),
      cluster: input.cluster,
      source: input.source,
      search_volume: input.search_volume ?? null,
      volume_source: input.volume_source ?? null,
      volume_confidence: input.volume_confidence ?? 'unknown',
      first_seen_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    };
    rows.push(created);
    writeFile('keywords.json', rows);
    return created;
  });
}

export async function listKeywords(filters?: {
  language?: Language;
  intent?: Intent;
  cluster?: string;
}): Promise<Keyword[]> {
  if (isSupabase()) {
    const params: string[] = ['select=*', 'order=last_seen_at.desc'];
    if (filters?.language) params.push(`language=eq.${encodeURIComponent(filters.language)}`);
    if (filters?.intent) params.push(`intent=eq.${encodeURIComponent(filters.intent)}`);
    if (filters?.cluster) params.push(`cluster=eq.${encodeURIComponent(filters.cluster)}`);
    const res = await sbFetch(`keywords?${params.join('&')}`);
    return sbJson<Keyword[]>(res, 'listKeywords');
  }
  let rows = readFile<Keyword>('keywords.json');
  if (filters?.language) rows = rows.filter((k) => k.language === filters.language);
  if (filters?.intent) rows = rows.filter((k) => k.intent === filters.intent);
  if (filters?.cluster) rows = rows.filter((k) => k.cluster === filters.cluster);
  return rows.sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
}

/** Permanently remove a manually managed keyword; scoped by UUID to prevent mass deletion. */
export async function updateKeyword(id: string, patch: Pick<Keyword, 'term' | 'language' | 'intent' | 'cluster'>): Promise<Keyword | null> {
  const term = patch.term.trim();
  if (!term) throw new Error('Keyword term cannot be empty');
  if (!['ar', 'en', 'zh'].includes(patch.language)) throw new Error('Invalid keyword language');
  const rows = await listKeywords();
  if (rows.some((k) => k.id !== id && k.language === patch.language && k.term.toLocaleLowerCase() === term.toLocaleLowerCase())) {
    throw new Error('A keyword with this term and language already exists');
  }
  const changes = {term, language: patch.language, intent: patch.intent, cluster: patch.cluster || null, updated_at: nowIso()};
  if (isSupabase()) {
    const res = await sbFetch(`keywords?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: {Prefer: 'return=representation'}, body: JSON.stringify(changes)
    });
    const updated = await sbJson<Keyword[]>(res, 'updateKeyword');
    return updated[0] || null;
  }
  return withFileLock(() => {
    const data = readFile<Keyword>('keywords.json');
    const i = data.findIndex((k) => k.id === id);
    if (i < 0) return null;
    data[i] = {...data[i], ...changes} as Keyword;
    writeFile('keywords.json', data);
    return data[i];
  });
}

export async function deleteKeyword(id: string): Promise<boolean> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) throw new Error('A valid keyword ID is required');
  if (isSupabase()) {
    const response = await sbFetch(`keywords?id=eq.${encodeURIComponent(id)}&select=id`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    const deleted = await sbJson<Array<{ id: string }>>(response, 'deleteKeyword');
    return deleted.some((row) => row.id === id);
  }
  return withFileLock(() => {
    const rows = readFile<Keyword>('keywords.json');
    const filtered = rows.filter((row) => row.id !== id);
    if (filtered.length === rows.length) return false;
    writeFile('keywords.json', filtered);
    return true;
  });
}
